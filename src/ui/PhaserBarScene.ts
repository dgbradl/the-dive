import Phaser from 'phaser';
import { catalog } from '../game/content';
import type { ShiftEntry } from '../game/types';

// Sepia Tavern palette (matches CSS tokens)
const COLORS = {
  bg: 0x0e0a06,           // tavern-pitch
  bar: 0x4a3220,          // tavern-leather
  barTop: 0x6a4a2e,       // tavern-tobacco
  door: 0x261a10,         // tavern-oak
  text: '#e8dcb8',        // ink-bone
  amber: '#d8a55c',       // tavern-whiskey
  cheerTint: 0xb88a4a,    // tavern-amber tint on cheer
  angryTint: 0xc84a2a,    // stain-cherry
  dim: '#8a7a5a',         // ink-dust
};

const ARCHETYPE_SPRITES: Record<string, string> = {
  dive_regular: 'sprite_dive_regular',
  lost_tourist: 'sprite_lost_tourist',
  rowdy_college_kid: 'sprite_rowdy_college_kid',
};
const FALLBACK_SPRITE = 'sprite_generic';

interface CustomerSprite {
  image: Phaser.GameObjects.Image;
  nameLabel?: Phaser.GameObjects.Text;
  archetypeId: string;
  regularId?: string;
  /** When set, the sprite occupies a fixed bar-stool slot (0..STOOLS-1). */
  stool?: number;
}

const STOOLS = 5;

const ARRIVAL_BUBBLES: Record<string, string> = {
  dive_regular: 'Same as always.',
  lost_tourist: 'What’s good?',
  rowdy_college_kid: 'BUDS!',
  date_night_couple: 'Two of those.',
  yelp_reviewer: 'Mind a photo?',
  wedding_party: 'OPEN BAR?!',
};

export class BarScene extends Phaser.Scene {
  private waiting: CustomerSprite[] = [];
  private bannerText?: Phaser.GameObjects.Text;
  private viewW = 0;
  private viewH = 0;

  constructor() {
    super('BarScene');
  }

  preload() {
    this.load.image('bartender_marv', '/sprites/marv.png');
    this.load.image('sprite_dee', '/sprites/dee.png');
    this.load.image('sprite_skeeter', '/sprites/skeeter.png');
    this.load.image('sprite_dive_regular', '/sprites/dive_regular.png');
    this.load.image('sprite_lost_tourist', '/sprites/lost_tourist.png');
    this.load.image('sprite_rowdy_college_kid', '/sprites/rowdy_college_kid.png');
    this.load.image('sprite_generic', '/sprites/generic.png');
    this.load.image('tex_wood', '/textures/wood-paneling.png');
    this.load.image('tex_shelf', '/textures/bottle-shelf.png');
  }

  create() {
    const cam = this.cameras.main;
    this.viewW = cam.width;
    this.viewH = cam.height;
    cam.setBackgroundColor(COLORS.bg);

    // Wood-paneling floor + back wall
    this.add.tileSprite(0, 0, this.viewW, this.viewH, 'tex_wood').setOrigin(0, 0).setAlpha(0.85);

    // Bottle shelf along the top
    const shelf = this.add.image(this.viewW / 2, this.viewH * 0.18, 'tex_shelf');
    const shelfScale = (this.viewW * 0.95) / shelf.width;
    shelf.setScale(shelfScale);

    // Bar counter — bottom-ish (kept as geometry until we get a counter sprite)
    const barY = this.viewH * 0.72;
    this.add.rectangle(this.viewW / 2, barY, this.viewW * 0.92, this.viewH * 0.14, COLORS.bar);
    this.add.rectangle(this.viewW / 2, barY - this.viewH * 0.07, this.viewW * 0.92, this.viewH * 0.012, COLORS.barTop);

    // Door — left edge
    this.add.rectangle(this.viewW * 0.07, this.viewH * 0.5, this.viewW * 0.08, this.viewH * 0.20, COLORS.door);
    this.add.text(this.viewW * 0.07, this.viewH * 0.36, 'DOOR', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: COLORS.dim,
    }).setOrigin(0.5);

    // Bartender (Marv) behind the bar
    const marv = this.add.image(this.viewW / 2, barY - this.viewH * 0.02, 'bartender_marv').setOrigin(0.5, 1);
    const marvScale = (this.viewH * 0.22) / marv.height;
    marv.setScale(marvScale);
    this.add.text(this.viewW / 2, barY + this.viewH * 0.06, 'MARV', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: COLORS.dim,
    }).setOrigin(0.5);

    // Banner space at top for events
    this.bannerText = this.add.text(this.viewW / 2, this.viewH * 0.05, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: COLORS.amber,
      align: 'center',
      wordWrap: { width: this.viewW * 0.9 },
    }).setOrigin(0.5);
  }

  handleEntry(entry: ShiftEntry) {
    switch (entry.kind) {
      case 'CustomerArrived':
        this.spawnCustomer(entry);
        break;
      case 'Served':
        this.serveCustomer(entry);
        break;
      case 'Walkout':
        this.walkoutCustomer(entry);
        break;
      case 'Mishap':
        this.shake();
        this.flashBanner(entry.text, '#c84a2a'); // stain-cherry
        break;
      case 'Event':
        this.flashBanner(entry.text, '#d8a55c'); // tavern-whiskey
        break;
      case 'Note':
      case 'Wages':
        this.flashBanner(entry.text, '#c8b890'); // ink-cream
        break;
    }
  }

  reset() {
    for (const c of this.waiting) {
      c.image.destroy();
      c.nameLabel?.destroy();
    }
    this.waiting = [];
    if (this.bannerText) this.bannerText.text = '';
  }

  private spriteKey(archetypeId?: string): string {
    if (archetypeId && ARCHETYPE_SPRITES[archetypeId]) return ARCHETYPE_SPRITES[archetypeId];
    return FALLBACK_SPRITE;
  }

  private spawnCustomer(entry: ShiftEntry) {
    const archetypeId = entry.customerArchetypeId;
    const arch = archetypeId ? catalog.customerArchetypes.find((a) => a.id === archetypeId) : undefined;

    // Named regulars take a fixed bar-stool slot; anonymous customers
    // queue along the floor above the counter.
    const stool = entry.regularId ? this.firstFreeStool() : undefined;
    const startX = this.viewW * 0.07;
    const targetH = this.viewH * 0.18;
    const isSeated = stool !== undefined;
    const y = isSeated ? this.stoolY() : this.viewH * 0.55;

    const image = this.add.image(startX, y, this.spriteKey(archetypeId)).setOrigin(0.5, 1);
    image.setScale(targetH / image.height);

    let nameLabel: Phaser.GameObjects.Text | undefined;
    if (entry.regularId && entry.customerDisplayName) {
      nameLabel = this.add.text(startX, y + 6, entry.customerDisplayName.toUpperCase(), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: COLORS.amber,
      }).setOrigin(0.5, 0);
    }

    const sprite: CustomerSprite = {
      image,
      nameLabel,
      archetypeId: arch?.id ?? 'unknown',
      regularId: entry.regularId,
      stool,
    };
    this.waiting.push(sprite);

    const targetX =
      stool !== undefined
        ? this.stoolX(stool)
        : this.queueX(this.queueOnlyCount() - 1);
    this.tweens.add({ targets: image, x: targetX, duration: 350, ease: 'Sine.easeOut' });
    if (nameLabel) {
      this.tweens.add({ targets: nameLabel, x: targetX, duration: 350, ease: 'Sine.easeOut' });
    }

    // Brief speech bubble above their head.
    const bubbleText = ARRIVAL_BUBBLES[arch?.id ?? ''];
    if (bubbleText) {
      this.flashBubble(targetX, y - targetH - 6, bubbleText);
    }
  }

  private flashBubble(x: number, y: number, text: string) {
    const bubble = this.add.text(x, y, text, {
      fontFamily: '"VT323", monospace',
      fontSize: '14px',
      color: '#1a120a',
      backgroundColor: '#e8dcb8',
      padding: { left: 6, right: 6, top: 2, bottom: 2 },
    }).setOrigin(0.5, 1).setAlpha(0);
    this.tweens.add({ targets: bubble, alpha: 1, duration: 200 });
    this.tweens.add({
      targets: bubble,
      alpha: 0,
      delay: 1400,
      duration: 300,
      onComplete: () => bubble.destroy(),
    });
  }

  private serveCustomer(entry: ShiftEntry) {
    const idx = this.findWaitingIndex(entry);
    if (idx === -1) return;
    const sprite = this.waiting[idx];
    this.waiting.splice(idx, 1);

    const baseScale = sprite.image.scale;
    sprite.nameLabel?.destroy();
    // Cheer effect — quick scale pulse, then walk off-right
    this.tweens.add({
      targets: sprite.image,
      scale: baseScale * 1.25,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: sprite.image,
          x: this.viewW + 40,
          alpha: 0.2,
          duration: 500,
          ease: 'Sine.easeIn',
          onComplete: () => sprite.image.destroy(),
        });
      },
    });
    this.repackQueue();
  }

  private walkoutCustomer(entry: ShiftEntry) {
    const idx = this.findWaitingIndex(entry);
    if (idx === -1) return;
    const sprite = this.waiting[idx];
    this.waiting.splice(idx, 1);

    sprite.image.setTint(COLORS.angryTint);
    sprite.nameLabel?.destroy();
    this.tweens.add({
      targets: sprite.image,
      x: -40,
      alpha: 0.2,
      duration: 450,
      ease: 'Sine.easeIn',
      onComplete: () => sprite.image.destroy(),
    });
    this.repackQueue();
  }

  private findWaitingIndex(entry: ShiftEntry): number {
    // Prefer named regulars by id; fall back to archetype match; fall back to head.
    if (entry.regularId) {
      const exact = this.waiting.findIndex((c) => c.regularId === entry.regularId);
      if (exact !== -1) return exact;
    }
    const archetypeId = entry.customerArchetypeId;
    if (archetypeId) {
      const byArch = this.waiting.findIndex((c) => c.archetypeId === archetypeId);
      if (byArch !== -1) return byArch;
    }
    return this.waiting.length > 0 ? 0 : -1;
  }

  private queueX(index: number): number {
    const left = this.viewW * 0.2;
    const right = this.viewW * 0.85;
    const slot = (right - left) / 6;
    return left + slot * Math.min(index, 5);
  }

  private stoolX(slot: number): number {
    const left = this.viewW * 0.18;
    const right = this.viewW * 0.88;
    const span = right - left;
    return left + (span / (STOOLS - 1)) * slot;
  }

  private stoolY(): number {
    return this.viewH * 0.68;
  }

  private firstFreeStool(): number | undefined {
    const taken = new Set<number>();
    for (const c of this.waiting) if (c.stool !== undefined) taken.add(c.stool);
    for (let i = 0; i < STOOLS; i++) if (!taken.has(i)) return i;
    return undefined; // all stools full → fall back to queue
  }

  private queueOnlyCount(): number {
    return this.waiting.filter((c) => c.stool === undefined).length;
  }

  private repackQueue() {
    let qi = 0;
    for (const c of this.waiting) {
      if (c.stool !== undefined) continue;
      const x = this.queueX(qi++);
      this.tweens.add({ targets: c.image, x, duration: 220, ease: 'Sine.easeOut' });
      if (c.nameLabel) this.tweens.add({ targets: c.nameLabel, x, duration: 220, ease: 'Sine.easeOut' });
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
