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
  bobTween?: Phaser.Tweens.Tween;
  /** Patience indicator (drink emoji + thinning bar) above the head. */
  patiencePanel?: Phaser.GameObjects.Container;
  patienceFill?: Phaser.GameObjects.Rectangle;
  arrivalTick?: number;
  maxPatience?: number;
}

/** Maps drink id → emoji shown in the customer's want indicator. */
const DRINK_EMOJI: Record<string, string> = {
  pbr: '🍺',
  whiskey_sour: '🥃',
  house_special: '🍹',
};

/** Patience bar palette — sepia tavern stains. */
const PATIENCE_FILL = {
  full:    0x4a7a5a, // stain-mint
  warning: 0xb88a4a, // tavern-amber
  low:     0xc84a2a, // stain-cherry
};

const PATIENCE_BAR_WIDTH = 36;
const PATIENCE_BAR_HEIGHT = 6;

const STOOLS = 5;

/**
 * Floor table seats — two pairs around two tables. Served anonymous
 * customers settle at a free seat to "drink with friends" instead of
 * walking off-screen.
 */
const TABLE_SEATS: { x: number; y: number; faceLeft: boolean }[] = [
  { x: 0.18, y: 0.78, faceLeft: false }, // table 1 — left side
  { x: 0.30, y: 0.86, faceLeft: true  }, // table 1 — right side
  { x: 0.62, y: 0.80, faceLeft: false }, // table 2 — left side
  { x: 0.74, y: 0.88, faceLeft: true  }, // table 2 — right side
];

const CHAT_LINES = ['Cheers!', 'Ha!', 'No way…', 'Same.', 'Tell me again.', 'Yikes.', 'Hey now.'];

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
  /** Customers who got served and settled at a table — kept alive on screen. */
  private tableSeated: (CustomerSprite & { tableSeat: number })[] = [];
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

    const BACK_WALL_BOTTOM = this.viewH * 0.30;
    const FLOOR_TOP        = this.viewH * 0.50;
    const BAR_Y            = this.viewH * 0.46;

    // Lit back wall (warm tint) — top of canvas to wall bottom.
    this.add.tileSprite(0, 0, this.viewW, BACK_WALL_BOTTOM + 20, 'tex_wood')
      .setOrigin(0, 0)
      .setTint(0x6a4a2e); // tavern-tobacco

    // Darker floor — from FLOOR_TOP down to canvas bottom.
    this.add.tileSprite(0, FLOOR_TOP, this.viewW, this.viewH - FLOOR_TOP, 'tex_wood')
      .setOrigin(0, 0)
      .setTint(0x3a2516); // tavern-mahogany

    // Wall/floor seam shadow line.
    this.add.rectangle(this.viewW / 2, FLOOR_TOP, this.viewW, 2, 0x1a120a)
      .setOrigin(0.5, 0)
      .setAlpha(0.7);

    // Two staggered rows of bottle shelf for repeating bottles.
    this.add.tileSprite(0, this.viewH * 0.06, this.viewW, 56, 'tex_shelf').setOrigin(0, 0);
    this.add.tileSprite(0, this.viewH * 0.18, this.viewW, 56, 'tex_shelf')
      .setOrigin(0, 0)
      .setAlpha(0.85);

    // Bar counter — middle band.
    this.add.rectangle(this.viewW / 2, BAR_Y, this.viewW * 0.94, this.viewH * 0.10, COLORS.bar);
    this.add.rectangle(this.viewW / 2, BAR_Y - this.viewH * 0.05, this.viewW * 0.94, this.viewH * 0.012, COLORS.barTop);

    // Door — left edge, between back wall and floor.
    this.add.rectangle(this.viewW * 0.07, this.viewH * 0.40, this.viewW * 0.08, this.viewH * 0.18, COLORS.door);
    this.add.text(this.viewW * 0.07, this.viewH * 0.30, 'DOOR', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: COLORS.dim,
    }).setOrigin(0.5);

    // Floor tables — two ellipse tabletops with seat slots around them.
    const tableSpots: [number, number][] = [
      [this.viewW * 0.24, this.viewH * 0.82],
      [this.viewW * 0.68, this.viewH * 0.84],
    ];
    for (const [tx, ty] of tableSpots) {
      this.add.ellipse(tx, ty, this.viewW * 0.18, 18, 0x261a10).setStrokeStyle(1, 0x1a120a);
      this.add.ellipse(tx, ty - 2, this.viewW * 0.16, 12, 0x4a3220);
    }

    // Bartender (Marv) behind the bar.
    const marv = this.add.image(this.viewW / 2, BAR_Y + this.viewH * 0.01, 'bartender_marv').setOrigin(0.5, 1);
    const marvScale = (this.viewH * 0.20) / marv.height;
    marv.setScale(marvScale);
    this.add.text(this.viewW / 2, BAR_Y + this.viewH * 0.04, 'MARV', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: COLORS.dim,
    }).setOrigin(0.5);

    // Banner space at top for events.
    this.bannerText = this.add.text(this.viewW / 2, this.viewH * 0.04, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: COLORS.amber,
      align: 'center',
      wordWrap: { width: this.viewW * 0.9 },
    }).setOrigin(0.5);

    // Periodic chat bubbles among seated customers — gives the bar life
    // without being a distraction.
    this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => this.chatTick(),
    });
  }

  private chatTick() {
    const candidates = this.tableSeated;
    if (candidates.length === 0) return;
    if (Math.random() > 0.55) return; // sometimes no chatter
    const sprite = candidates[Math.floor(Math.random() * candidates.length)];
    const seat = TABLE_SEATS[sprite.tableSeat];
    if (!seat) return;
    const x = this.viewW * seat.x;
    const y = this.viewH * seat.y - this.viewH * 0.16 - 6;
    const line = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
    this.flashBubble(x, y, line);
  }

  /** Phaser calls this every frame; we use it to lock the patience panels onto their sprite. */
  update() {
    for (const c of this.waiting) {
      if (!c.patiencePanel) continue;
      c.patiencePanel.x = c.image.x;
      c.patiencePanel.y = c.image.y - c.image.displayHeight - 12;
    }
  }

  private updatePatienceForTick(tick: number) {
    for (const c of this.waiting) {
      if (!c.patienceFill || c.arrivalTick === undefined || c.maxPatience === undefined) continue;
      const elapsed = Math.max(0, tick - c.arrivalTick);
      const ratio = Math.max(0, Math.min(1, 1 - elapsed / c.maxPatience));
      c.patienceFill.width = PATIENCE_BAR_WIDTH * ratio;
      const color =
        ratio > 0.66 ? PATIENCE_FILL.full
        : ratio > 0.33 ? PATIENCE_FILL.warning
        : PATIENCE_FILL.low;
      c.patienceFill.fillColor = color;
    }
  }

  handleEntry(entry: ShiftEntry) {
    if (entry.tick > 0) this.updatePatienceForTick(entry.tick);
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
      c.bobTween?.stop();
      c.image.destroy();
      c.nameLabel?.destroy();
      c.patiencePanel?.destroy();
    }
    for (const c of this.tableSeated) {
      c.bobTween?.stop();
      c.image.destroy();
    }
    this.waiting = [];
    this.tableSeated = [];
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
    // queue along the floor in front of the counter.
    const stool = entry.regularId ? this.firstFreeStool() : undefined;
    const startX = this.viewW * 0.07;
    const targetH = this.viewH * 0.16;
    const isSeated = stool !== undefined;
    const y = isSeated ? this.stoolY() : this.queueY();

    const image = this.add.image(startX, y, this.spriteKey(archetypeId)).setOrigin(0.5, 1);
    image.setScale(targetH / image.height);

    let nameLabel: Phaser.GameObjects.Text | undefined;
    if (entry.regularId && entry.customerDisplayName) {
      nameLabel = this.add.text(startX, y + 4, entry.customerDisplayName.toUpperCase(), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: COLORS.amber,
      }).setOrigin(0.5, 0);
    }

    const drinkId = arch?.preferredDrinkIds[0];
    const drinkGlyph = (drinkId && DRINK_EMOJI[drinkId]) ?? '🍺';
    const patiencePanel = this.add.container(this.viewW * 0.07, y - targetH - 14);
    const panelBg = this.add.rectangle(0, 0, PATIENCE_BAR_WIDTH + 22, 14, 0x261a10)
      .setStrokeStyle(1, 0x0a0604);
    const drinkText = this.add.text(-PATIENCE_BAR_WIDTH / 2 - 6, 0, drinkGlyph, {
      fontSize: '11px',
    }).setOrigin(0.5, 0.5);
    const barTrack = this.add.rectangle(2, 0, PATIENCE_BAR_WIDTH, PATIENCE_BAR_HEIGHT, 0x0a0604)
      .setStrokeStyle(1, 0x1a120a)
      .setOrigin(0, 0.5);
    const barFill = this.add.rectangle(2, 0, PATIENCE_BAR_WIDTH, PATIENCE_BAR_HEIGHT - 2, PATIENCE_FILL.full)
      .setOrigin(0, 0.5);
    patiencePanel.add([panelBg, drinkText, barTrack, barFill]);

    const sprite: CustomerSprite = {
      image,
      nameLabel,
      archetypeId: arch?.id ?? 'unknown',
      regularId: entry.regularId,
      stool,
      patiencePanel,
      patienceFill: barFill,
      arrivalTick: entry.tick,
      maxPatience: arch?.patienceTicks ?? 5,
    };
    this.waiting.push(sprite);

    const targetX =
      stool !== undefined
        ? this.stoolX(stool)
        : this.queueX(this.queueOnlyCount() - 1);
    this.tweens.add({
      targets: image,
      x: targetX,
      duration: 350,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (isSeated) {
          // 2px step-bob so seated regulars aren't statues.
          sprite.bobTween = this.tweens.add({
            targets: image,
            y: y - 2,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Steps(1)',
          });
        }
      },
    });
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
    sprite.bobTween?.stop();
    sprite.bobTween = undefined;
    sprite.nameLabel?.destroy();
    sprite.nameLabel = undefined;
    sprite.patiencePanel?.destroy();
    sprite.patiencePanel = undefined;
    sprite.patienceFill = undefined;

    // Named regulars stay on their stool. Anonymous customers try to
    // grab a free table seat to chill with friends; otherwise they
    // walk off-right after a cheer pulse.
    const stoolBound = sprite.stool !== undefined;
    const seatIdx = stoolBound ? undefined : this.firstFreeTableSeat();

    // Cheer pulse first.
    this.tweens.add({
      targets: sprite.image,
      scale: baseScale * 1.25,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        if (stoolBound) {
          // Restart the seated bob — they finished their drink, now they linger.
          const restY = this.stoolY();
          sprite.bobTween = this.tweens.add({
            targets: sprite.image,
            y: restY - 2,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Steps(1)',
          });
          return;
        }
        if (seatIdx !== undefined) {
          this.walkToTableSeat(sprite, seatIdx);
        } else {
          // No room — walk off-right.
          this.tweens.add({
            targets: sprite.image,
            x: this.viewW + 40,
            alpha: 0.2,
            duration: 500,
            ease: 'Sine.easeIn',
            onComplete: () => sprite.image.destroy(),
          });
        }
      },
    });
    this.repackQueue();
  }

  private walkToTableSeat(sprite: CustomerSprite, seatIdx: number) {
    const seat = TABLE_SEATS[seatIdx];
    const targetX = this.viewW * seat.x;
    const targetY = this.viewH * seat.y;
    sprite.image.setFlipX(seat.faceLeft);
    this.tweens.add({
      targets: sprite.image,
      x: targetX,
      y: targetY,
      duration: 700,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Settle in with a slow bob.
        sprite.bobTween = this.tweens.add({
          targets: sprite.image,
          y: targetY - 2,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Steps(1)',
        });
      },
    });
    const seated = sprite as CustomerSprite & { tableSeat: number };
    seated.tableSeat = seatIdx;
    this.tableSeated.push(seated);
  }

  private firstFreeTableSeat(): number | undefined {
    const taken = new Set<number>();
    for (const c of this.tableSeated) taken.add(c.tableSeat);
    for (let i = 0; i < TABLE_SEATS.length; i++) if (!taken.has(i)) return i;
    return undefined;
  }

  private walkoutCustomer(entry: ShiftEntry) {
    const idx = this.findWaitingIndex(entry);
    if (idx === -1) return;
    const sprite = this.waiting[idx];
    this.waiting.splice(idx, 1);

    sprite.image.setTint(COLORS.angryTint);
    sprite.bobTween?.stop();
    sprite.nameLabel?.destroy();
    sprite.patiencePanel?.destroy();
    sprite.patiencePanel = undefined;
    sprite.patienceFill = undefined;
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
    // Seated at the bar — feet land just below the counter line.
    return this.viewH * 0.55;
  }

  private queueY(): number {
    // Standing on the floor in front of the bar.
    return this.viewH * 0.66;
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
