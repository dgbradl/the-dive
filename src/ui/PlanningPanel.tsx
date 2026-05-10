import type { Drink, GameState, HiredStaff, Regular, StaffArchetype, StaffTrait, Upgrade } from '../game/types';
import { Station } from '../game/types';
import { catalog } from '../game/content';
import { upcomingMilestone } from '../game/milestones';
import { MuteButton } from './MuteButton';

const STAFF_SPRITES: Record<string, string> = {
  marv_bartender: '/sprites/marv.png',
  skeeter_bouncer: '/sprites/skeeter.png',
  dee_server: '/sprites/dee.png',
};

function StaffPortrait({ archetypeId, fallback }: { archetypeId: string | undefined; fallback: string }) {
  const src = archetypeId ? STAFF_SPRITES[archetypeId] : undefined;
  if (src) return <img className="portrait" src={src} alt="" width={48} height={48} />;
  return <span className="emoji">{fallback}</span>;
}

interface Props {
  state: GameState;
  onStartShift: () => void;
  onResetSave: () => void;
  onHire: (archetypeId: string) => void;
  onFire: (instanceId: string) => void;
  onAssign: (instanceId: string, station: Station) => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onSetDrinkPrice: (drinkId: string, price: number | null) => void;
  onOrderCase: (drinkId: string) => void;
  onSetSpecial: (drinkId: string | null) => void;
}

const MIN_PRICE = 1;
const MAX_PRICE = 30;

const STATIONS: Station[] = [Station.OffShift, Station.Bar, Station.Floor, Station.Door];
const STATION_LABELS: Record<Station, string> = {
  [Station.OffShift]: 'Off',
  [Station.Bar]: 'Bar',
  [Station.Floor]: 'Floor',
  [Station.Door]: 'Door',
};

export function PlanningPanel({
  state,
  onStartShift,
  onResetSave,
  onHire,
  onFire,
  onAssign,
  onBuyUpgrade,
  onSetDrinkPrice,
  onOrderCase,
  onSetSpecial,
}: Props) {
  const hiredArchetypeIds = new Set(state.hiredStaff.map((h) => h.archetypeId));
  const availableHires = catalog.staffArchetypes.filter((a) => !hiredArchetypeIds.has(a.id));
  const ownedUpgrades = catalog.upgrades.filter((u) => state.ownedUpgradeIds.includes(u.id));
  const availableUpgrades = catalog.upgrades.filter((u) => !state.ownedUpgradeIds.includes(u.id));

  return (
    <div className="panel planning-panel">
      <div className="header">
        <h1>
          <img className="wordmark" src="/brand/wordmark-stamp.svg" alt="The Dive" />
          <span>Day {state.day}</span>
        </h1>
        <div className="stats">
          <div className="stat">
            <span className="label">Cash</span>
            <span className="value">${state.cash}</span>
          </div>
          <div className="stat">
            <span className="label">Rep</span>
            <span className="value">{state.reputation}</span>
          </div>
          <MuteButton />
        </div>
      </div>

      <MilestoneBanner state={state} />

      <div className="section">
        <h2>Tonight's crew</h2>
        <ul className="staff-list">
          {state.hiredStaff.map((h) => {
            const arch = catalog.staffArchetypes.find((a) => a.id === h.archetypeId);
            const station = state.assignments.find((a) => a.staffInstanceId === h.instanceId)?.station ?? Station.OffShift;
            return (
              <HiredCard
                key={h.instanceId}
                hired={h}
                archetype={arch}
                station={station}
                onAssign={(s) => onAssign(h.instanceId, s)}
                onFire={() => onFire(h.instanceId)}
              />
            );
          })}
        </ul>
        {state.hiredStaff.length === 0 && (
          <p className="empty-hint">You've got nobody behind the bar. Tonight will be quiet.</p>
        )}
      </div>

      {availableHires.length > 0 && (
        <div className="section">
          <h2>Looking for work</h2>
          <ul className="staff-list">
            {availableHires.map((arch) => (
              <HireCard
                key={arch.id}
                archetype={arch}
                cash={state.cash}
                onHire={() => onHire(arch.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {state.regulars.length > 0 && (
        <div className="section">
          <h2>The regulars</h2>
          <ul className="regulars-list">
            {state.regulars.map((r) => (
              <RegularRow key={r.id} regular={r} currentDay={state.day} />
            ))}
          </ul>
        </div>
      )}

      <div className="section">
        <h2>Morning order</h2>
        <ul className="stock-list">
          {catalog.drinks.map((d) => (
            <StockRow
              key={d.id}
              drink={d}
              stock={state.drinkStock[d.id] ?? 0}
              cash={state.cash}
              onOrder={() => onOrderCase(d.id)}
            />
          ))}
        </ul>
      </div>

      <div className="section">
        <h2>Tonight's special</h2>
        <div className="special-pills" role="radiogroup" aria-label="Nightly special">
          <button
            type="button"
            className={`special-pill ${state.nightlySpecialDrinkId === null ? 'active' : ''}`}
            onClick={() => onSetSpecial(null)}
            aria-pressed={state.nightlySpecialDrinkId === null}
          >
            None
          </button>
          {catalog.drinks.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`special-pill ${state.nightlySpecialDrinkId === d.id ? 'active' : ''}`}
              onClick={() => onSetSpecial(d.id)}
              aria-pressed={state.nightlySpecialDrinkId === d.id}
            >
              {d.displayName}
            </button>
          ))}
        </div>
        <p className="special-hint">+20% pick weight on customers who like it · +1 rep per serve.</p>
      </div>

      <div className="section">
        <h2>Tonight's menu</h2>
        <ul className="menu-list">
          {catalog.drinks.map((d) => {
            const override = state.drinkPrices.find((p) => p.drinkId === d.id);
            const price = override?.price ?? d.suggestedPrice;
            return (
              <DrinkRow
                key={d.id}
                drink={d}
                price={price}
                hasOverride={!!override}
                onChange={(p) => onSetDrinkPrice(d.id, p)}
                onReset={() => onSetDrinkPrice(d.id, null)}
              />
            );
          })}
        </ul>
      </div>

      <div className="section">
        <h2>Upgrades</h2>
        {ownedUpgrades.length > 0 && (
          <div className="owned-upgrades">
            {ownedUpgrades.map((u) => (
              <span key={u.id} className="owned-pill">{u.displayName}</span>
            ))}
          </div>
        )}
        {availableUpgrades.length > 0 ? (
          <ul className="upgrade-list">
            {availableUpgrades.map((u) => (
              <UpgradeCard
                key={u.id}
                upgrade={u}
                cash={state.cash}
                onBuy={() => onBuyUpgrade(u.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="empty-hint">You've bought everything. Time to dream bigger.</p>
        )}
      </div>

      <div className="section flavor">
        <p>The dive opens at 8. Pour 'em strong.</p>
      </div>

      <div className="actions">
        <button className="primary" onClick={onStartShift}>Open the doors</button>
        <button className="ghost" onClick={onResetSave}>Reset save</button>
      </div>
    </div>
  );
}

interface HiredCardProps {
  hired: HiredStaff;
  archetype: StaffArchetype | undefined;
  station: Station;
  onAssign: (s: Station) => void;
  onFire: () => void;
}

function HiredCard({ hired, archetype, station, onAssign, onFire }: HiredCardProps) {
  return (
    <li className="staff-card">
      <StaffPortrait archetypeId={hired.archetypeId} fallback={archetype?.emoji ?? '🧍'} />
      <div className="staff-meta">
        <div className="staff-row-top">
          <span className="staff-name">{hired.displayName}</span>
          <button className="fire-btn" onClick={onFire} aria-label={`Fire ${hired.displayName}`}>×</button>
        </div>
        <div className="staff-role">{archetype?.role ?? '?'} · ${hired.wagePerDay}/day</div>
        <MoodMeter mood={hired.mood} />
        {archetype && <TraitChips traits={archetype.traits} />}
        <div className="station-toggle" role="group" aria-label="Assign station">
          {STATIONS.map((s) => (
            <button
              key={s}
              className={`seg ${station === s ? 'active' : ''}`}
              onClick={() => onAssign(s)}
            >
              {STATION_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

function MoodMeter({ mood }: { mood: number }) {
  const pct = Math.max(0, Math.min(100, mood));
  const tone = mood < 30 ? 'bad' : mood > 80 ? 'good' : 'neutral';
  const label = mood < 30 ? 'rough' : mood > 80 ? 'dialed' : '';
  return (
    <div className="mood-row">
      <span className="mood-label">Mood</span>
      <div className={`mood-meter ${tone}`} aria-label={`Mood ${mood}`}>
        <div className="mood-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="mood-value">{mood}{label && ` · ${label}`}</span>
    </div>
  );
}

interface HireCardProps {
  archetype: StaffArchetype;
  cash: number;
  onHire: () => void;
}

function HireCard({ archetype, cash, onHire }: HireCardProps) {
  const canAfford = cash >= archetype.hireCost;
  const summary = describeTraits(archetype.traits);
  return (
    <li className="staff-card hire-card">
      <StaffPortrait archetypeId={archetype.id} fallback={archetype.emoji} />
      <div className="staff-meta">
        <div className="staff-name">{archetype.displayName}</div>
        <div className="staff-role">{archetype.role} · ${archetype.baseWagePerDay}/day</div>
        <TraitChips traits={archetype.traits} />
        {summary && <div className="trait-summary">{summary}</div>}
        <div className="staff-flavor">{archetype.flavorText}</div>
        <button
          className="hire-btn"
          disabled={!canAfford}
          onClick={onHire}
        >
          {archetype.hireCost > 0 ? `Hire · $${archetype.hireCost}` : 'Hire (free)'}
        </button>
      </div>
    </li>
  );
}

const TRAIT_DESCRIPTIONS: Record<StaffTrait, string> = {
  Quick: 'faster service at the bar',
  Lazy: 'takes a smoke break each shift',
  Klutz: 'drops trays on the floor',
  Charming: '+30% tips, defuses crises at the door',
  Surly: '−30% tips',
  Chatty: 'customers wait longer',
};

function describeTraits(traits: StaffTrait[]): string {
  return traits.map((t) => TRAIT_DESCRIPTIONS[t]).join(' · ');
}

function TraitChips({ traits }: { traits: StaffTrait[] }) {
  if (traits.length === 0) return null;
  return (
    <div className="trait-chips">
      {traits.map((t) => (
        <span key={t} className="chip">{t}</span>
      ))}
    </div>
  );
}

function StockRow({
  drink,
  stock,
  cash,
  onOrder,
}: {
  drink: Drink;
  stock: number;
  cash: number;
  onOrder: () => void;
}) {
  const canAfford = cash >= drink.casePrice;
  const lowTone = stock === 0 ? 'out' : stock < drink.caseSize / 2 ? 'low' : '';
  return (
    <li className="stock-row">
      <div className="stock-meta">
        <div className="stock-name">{drink.displayName}</div>
        <div className="stock-sub">case of {drink.caseSize} · ${drink.casePrice}</div>
      </div>
      <div className={`stock-count ${lowTone}`}>{stock}</div>
      <button
        type="button"
        className="stock-order-btn"
        disabled={!canAfford}
        onClick={onOrder}
      >
        Order +{drink.caseSize}
      </button>
    </li>
  );
}

function MilestoneBanner({ state }: { state: GameState }) {
  const m = upcomingMilestone(state);
  if (!m) return null;
  const daysLeft = m.dueDay - state.day;
  const passing = m.check(state);
  return (
    <div className={`milestone-banner ${passing ? '' : 'warning'}`}>
      <span className="milestone-label">{m.bannerLabel(state)}</span>
      <span className="milestone-days">{daysLeft <= 0 ? 'TONIGHT' : `${daysLeft}d left`}</span>
    </div>
  );
}

function RegularRow({ regular, currentDay }: { regular: Regular; currentDay: number }) {
  const banned = regular.loyalty < 0;
  const lastSeen =
    regular.lastSeenDay === 0
      ? 'never been in'
      : currentDay - regular.lastSeenDay <= 0
        ? 'in last night'
        : `last seen ${currentDay - regular.lastSeenDay} day${currentDay - regular.lastSeenDay === 1 ? '' : 's'} ago`;
  return (
    <li className={`regular-row ${banned ? 'banned' : ''}`}>
      <img className="portrait small" src={`/sprites/${regular.spriteId}.png`} alt="" width={32} height={32} />
      <div className="regular-meta">
        <div className="regular-name">{regular.displayName}</div>
        <div className="regular-sub">{lastSeen}</div>
      </div>
      <LoyaltyMeter loyalty={regular.loyalty} />
    </li>
  );
}

function LoyaltyMeter({ loyalty }: { loyalty: number }) {
  // Map -10..10 to 0..100% fill. Negative loyalty fills with red, positive with green.
  const pct = Math.min(100, Math.abs(loyalty) * 10);
  const tone = loyalty < 0 ? 'bad' : loyalty > 0 ? 'good' : 'neutral';
  return (
    <div className={`loyalty-meter ${tone}`} aria-label={`Loyalty ${loyalty}`}>
      <div className="loyalty-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

interface DrinkRowProps {
  drink: Drink;
  price: number;
  hasOverride: boolean;
  onChange: (price: number) => void;
  onReset: () => void;
}

function DrinkRow({ drink, price, hasOverride, onChange, onReset }: DrinkRowProps) {
  const margin = price - drink.costToMake;
  const dec = () => onChange(Math.max(MIN_PRICE, price - 1));
  const inc = () => onChange(Math.min(MAX_PRICE, price + 1));
  return (
    <li className="drink-row">
      <div className="drink-meta">
        <div className="drink-name">{drink.displayName}</div>
        <div className="drink-sub">
          cost ${drink.costToMake} · margin ${margin}
          {hasOverride && (
            <button className="link-btn" onClick={onReset}>reset to ${drink.suggestedPrice}</button>
          )}
        </div>
      </div>
      <div className="stepper">
        <button className="step" onClick={dec} disabled={price <= MIN_PRICE} aria-label="Decrease price">−</button>
        <span className="price">${price}</span>
        <button className="step" onClick={inc} disabled={price >= MAX_PRICE} aria-label="Increase price">+</button>
      </div>
    </li>
  );
}

interface UpgradeCardProps {
  upgrade: Upgrade;
  cash: number;
  onBuy: () => void;
}

function UpgradeCard({ upgrade, cash, onBuy }: UpgradeCardProps) {
  const canAfford = cash >= upgrade.cost;
  const effects = formatUpgradeEffects(upgrade);
  return (
    <li className="upgrade-card">
      <div className="upgrade-meta">
        <div className="staff-name">{upgrade.displayName}</div>
        <div className="staff-flavor">{upgrade.flavorText}</div>
        {effects.length > 0 && (
          <div className="trait-chips">
            {effects.map((e) => (
              <span key={e} className="chip effect">{e}</span>
            ))}
          </div>
        )}
        <button className="hire-btn" disabled={!canAfford} onClick={onBuy}>
          Buy · ${upgrade.cost}
        </button>
      </div>
    </li>
  );
}

function formatUpgradeEffects(u: Upgrade): string[] {
  const out: string[] = [];
  if (u.spawnRateMultiplier !== 1) {
    const pct = Math.round((u.spawnRateMultiplier - 1) * 100);
    out.push(`${pct >= 0 ? '+' : ''}${pct}% customers`);
  }
  if (u.repPerShift !== 0) {
    out.push(`${u.repPerShift > 0 ? '+' : ''}${u.repPerShift} rep/shift`);
  }
  if (u.tipBonus !== 0) {
    out.push(`${u.tipBonus > 0 ? '+' : ''}$${u.tipBonus} tip`);
  }
  return out;
}
