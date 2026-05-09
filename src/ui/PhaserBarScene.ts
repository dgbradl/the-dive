import Phaser from 'phaser';
import { catalog } from '../game/content';
import type { ShiftEntry } from '../game/types';

const COLORS = {
  bg: 0x1a0f1f,
  bar: 0x4a2c1a,
  barTop: 0x6b3e26,
  door: 0x2a1f3a,
  text: '#e8c065',
  cheer: 0x6cd17a,
  angry: 0xd16c6c,
};

interface CustomerSprite {
  text: Phaser.GameObjects.Text;
  archetypeId: string;
}

export class BarScene extends Phaser.Scene {
  private waiting: CustomerSprite[] = [];
  private bannerText?: Phaser.GameObjects.Text;
  private viewW = 0;
  private viewH = 0;

  constructor() {
    super('BarScene');
  }

  create() {
    const cam = this.cameras.main;
    this.viewW = cam.width;
    this.viewH = cam.height;
    cam.setBackgroundColor(COLORS.bg);

    // Bar counter — bottom-ish
    const barY = this.viewH * 0.7;
    this.add.rectangle(this.viewW / 2, barY, this.viewW * 0.85, this.viewH * 0.12, COLORS.bar);
    this.add.rectangle(this.viewW / 2, barY - this.viewH * 0.06, this.viewW * 0.85, this.viewH * 0.01, COLORS.barTop);

    // Door — left edge
    this.add.rectangle(this.viewW * 0.07, this.viewH * 0.45, this.viewW * 0.08, this.viewH * 0.18, COLORS.door);
    this.add.text(this.viewW * 0.07, this.viewH * 0.32, 'door', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#7a6a8a',
    }).setOrigin(0.5);

    // Bartender (Marv) behind the bar
    this.add.text(this.viewW / 2, barY + this.viewH * 0.02, '🧑‍🍳', {
      fontSize: '32px',
    }).setOrigin(0.5);
    this.add.text(this.viewW / 2, barY + this.viewH * 0.07, 'Marv', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#9a8a6a',
    }).setOrigin(0.5);

    // Banner space at top for events
    this.bannerText = this.add.text(this.viewW / 2, this.viewH * 0.08, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: COLORS.text,
      align: 'center',
      wordWrap: { width: this.viewW * 0.9 },
    }).setOrigin(0.5);
  }

  handleEntry(entry: ShiftEntry) {
    switch (entry.kind) {
      case 'CustomerArrived':
        this.spawnCustomer(entry.customerArchetypeId);
        break;
      case 'Served':
        this.serveCustomer(entry.customerArchetypeId);
        break;
      case 'Walkout':
        this.walkoutCustomer(entry.customerArchetypeId);
        break;
      case 'Mishap':
        this.shake();
        this.flashBanner(entry.text, '#d16c6c');
        break;
      case 'Event':
        this.flashBanner(entry.text, '#e8c065');
        break;
      case 'Note':
      case 'Wages':
        this.flashBanner(entry.text, '#9aa6c2');
        break;
    }
  }

  reset() {
    for (const c of this.waiting) c.text.destroy();
    this.waiting = [];
    if (this.bannerText) this.bannerText.text = '';
  }

  private spawnCustomer(archetypeId?: string) {
    const arch = archetypeId ? catalog.customerArchetypes.find((a) => a.id === archetypeId) : undefined;
    const emoji = arch?.emoji ?? '🙂';

    const startX = this.viewW * 0.07;
    const y = this.viewH * 0.55;

    const text = this.add.text(startX, y, emoji, { fontSize: '28px' }).setOrigin(0.5);
    const sprite: CustomerSprite = { text, archetypeId: arch?.id ?? 'unknown' };
    this.waiting.push(sprite);

    const targetX = this.queueX(this.waiting.length - 1);
    this.tweens.add({
      targets: text,
      x: targetX,
      duration: 350,
      ease: 'Sine.easeOut',
    });
  }

  private serveCustomer(archetypeId?: string) {
    const idx = this.findWaitingIndex(archetypeId);
    if (idx === -1) return;
    const sprite = this.waiting[idx];
    this.waiting.splice(idx, 1);

    // Cheer effect
    this.tweens.add({
      targets: sprite.text,
      scale: 1.4,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        // Walk off to the right
        this.tweens.add({
          targets: sprite.text,
          x: this.viewW + 40,
          alpha: 0.2,
          duration: 500,
          ease: 'Sine.easeIn',
          onComplete: () => sprite.text.destroy(),
        });
      },
    });
    this.repackQueue();
  }

  private walkoutCustomer(archetypeId?: string) {
    const idx = this.findWaitingIndex(archetypeId);
    if (idx === -1) return;
    const sprite = this.waiting[idx];
    this.waiting.splice(idx, 1);

    sprite.text.setColor('#d16c6c');
    this.tweens.add({
      targets: sprite.text,
      x: -40,
      alpha: 0.2,
      duration: 450,
      ease: 'Sine.easeIn',
      onComplete: () => sprite.text.destroy(),
    });
    this.repackQueue();
  }

  private findWaitingIndex(archetypeId?: string): number {
    if (!archetypeId) return this.waiting.length > 0 ? 0 : -1;
    const idx = this.waiting.findIndex((c) => c.archetypeId === archetypeId);
    return idx === -1 && this.waiting.length > 0 ? 0 : idx;
  }

  private queueX(index: number): number {
    const left = this.viewW * 0.2;
    const right = this.viewW * 0.85;
    const slot = (right - left) / 6;
    return left + slot * Math.min(index, 5);
  }

  private repackQueue() {
    for (let i = 0; i < this.waiting.length; i++) {
      this.tweens.add({
        targets: this.waiting[i].text,
        x: this.queueX(i),
        duration: 220,
        ease: 'Sine.easeOut',
      });
    }
  }

  private shake() {
    this.cameras.main.shake(180, 0.005);
  }

  private flashBanner(text: string, color: string) {
    if (!this.bannerText) return;
    this.bannerText.setText(text);
    this.bannerText.setColor(color);
    this.bannerText.setAlpha(1);
    this.tweens.add({
      targets: this.bannerText,
      alpha: 0,
      delay: 1200,
      duration: 400,
    });
  }
}
