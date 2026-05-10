import { useState } from 'react';
import { catalog } from '../game/content';
import type { Signature } from '../game/types';

interface Props {
  signatures: Signature[];
  onCreate: (name: string, baseDrinkIds: [string, string]) => void;
  onDelete: (id: string) => void;
}

export function RecipeBook({ signatures, onCreate, onDelete }: Props) {
  const drinks = catalog.drinks;
  const [name, setName] = useState('');
  const [baseA, setBaseA] = useState(drinks[0]?.id ?? '');
  const [baseB, setBaseB] = useState(drinks[1]?.id ?? '');

  const canSubmit = name.trim().length > 0 && baseA && baseB && baseA !== baseB;

  const submit = () => {
    if (!canSubmit) return;
    onCreate(name.trim().slice(0, 24), [baseA, baseB]);
    setName('');
  };

  return (
    <div className="recipe-book">
      <div className="recipe-form">
        <label className="recipe-field">
          <span className="recipe-field-label">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Knockout Punch"
          />
        </label>
        <div className="recipe-bases">
          <label className="recipe-field">
            <span className="recipe-field-label">Base A</span>
            <select value={baseA} onChange={(e) => setBaseA(e.target.value)}>
              {drinks.map((d) => (
                <option key={d.id} value={d.id}>{d.displayName}</option>
              ))}
            </select>
          </label>
          <span className="recipe-plus" aria-hidden="true">+</span>
          <label className="recipe-field">
            <span className="recipe-field-label">Base B</span>
            <select value={baseB} onChange={(e) => setBaseB(e.target.value)}>
              {drinks.map((d) => (
                <option key={d.id} value={d.id}>{d.displayName}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="recipe-save"
          disabled={!canSubmit}
          onClick={submit}
        >
          Add to book
        </button>
      </div>

      {signatures.length > 0 && (
        <ul className="recipe-list">
          {signatures.map((sig) => {
            const a = drinks.find((d) => d.id === sig.baseDrinkIds[0])?.displayName ?? '?';
            const b = drinks.find((d) => d.id === sig.baseDrinkIds[1])?.displayName ?? '?';
            return (
              <li key={sig.id} className="recipe-row">
                <div className="recipe-meta">
                  <div className="recipe-name">{sig.displayName}</div>
                  <div className="recipe-recipe">{a} + {b} · ${sig.suggestedPrice}</div>
                </div>
                <button
                  type="button"
                  className="recipe-delete"
                  onClick={() => onDelete(sig.id)}
                  aria-label={`Delete ${sig.displayName}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
