'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';

export const ITEM_CATEGORIES = [
  'New Material Purchase',
  'New Machinery Purchase',
  'Service Requirement',
  'Spare Parts',
  'Insurance',
  'Others',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface RequestItem {
  id: string;
  category: string;
  otherCategory?: string;
  name: string;
  make: string;
  model: string;
  quantity: string;
  unit: string;
  customUnit?: string;
  description: string;
}

interface RequestDescriptionInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export const COMMON_UNITS = [
  'Nos',
  'Pcs',
  'Boxes',
  'Sets',
  'Pack',
  'Units',
  'Kg',
  'Grams',
  'Meters',
  'Feet',
  'Liters',
  'Reams',
  'Rolls',
  'Pairs',
  'Bags',
  'Bottles',
  'Cans',
  'Drums',
  'Hours',
  'Days',
  'Lot',
] as const;

export const UNIT_OPTIONS = [
  { value: 'Nos', label: 'Nos (Numbers)' },
  { value: 'Pcs', label: 'Pcs (Pieces)' },
  { value: 'Boxes', label: 'Boxes' },
  { value: 'Sets', label: 'Sets' },
  { value: 'Pack', label: 'Pack' },
  { value: 'Units', label: 'Units' },
  { value: 'Kg', label: 'Kg (Kilograms)' },
  { value: 'Grams', label: 'Grams (g)' },
  { value: 'Meters', label: 'Meters (m)' },
  { value: 'Feet', label: 'Feet (ft)' },
  { value: 'Liters', label: 'Liters (L)' },
  { value: 'Rolls', label: 'Rolls' },
  { value: 'Pairs', label: 'Pairs' },
  { value: 'Reams', label: 'Reams' },
  { value: 'Bags', label: 'Bags' },
  { value: 'Bottles', label: 'Bottles' },
  { value: 'Cans', label: 'Cans' },
  { value: 'Drums', label: 'Drums' },
  { value: 'Hours', label: 'Hours (Service)' },
  { value: 'Days', label: 'Days (Service)' },
  { value: 'Lot', label: 'Lot / Job' },
  { value: 'Other', label: 'Other (Custom...)' },
];

export function formatItemsToString(items: RequestItem[]): string {
  if (!Array.isArray(items)) return '';

  const activeItems = items.filter(
    (it) =>
      it &&
      (Boolean(it.name?.trim()) ||
        Boolean(it.make?.trim()) ||
        Boolean(it.model?.trim()) ||
        Boolean(it.description?.trim()) ||
        Boolean(it.quantity?.trim()))
  );

  if (activeItems.length === 0) return '';

  return activeItems
    .map((it, idx) => {
      const lines: string[] = [`Item ${idx + 1}: ${it.name?.trim() || '(No Item Name)'}`];

      const categoryDisplay =
        it.category === 'Others'
          ? it.otherCategory?.trim()
            ? `Others - ${it.otherCategory.trim()}`
            : 'Others'
          : it.category?.trim() || 'New Material / Purchase';

      lines.push(`• Item Type: ${categoryDisplay}`);

      if (it.make?.trim()) {
        lines.push(`• Make: ${it.make.trim()}`);
      }
      if (it.model?.trim()) {
        lines.push(`• Model: ${it.model.trim()}`);
      }
      if (it.quantity?.trim()) {
        const resolvedUnit =
          it.unit === 'Other'
            ? it.customUnit?.trim() || ''
            : it.unit?.trim() || 'Nos';
        const unitPart = resolvedUnit ? ` ${resolvedUnit}` : '';
        lines.push(`• Quantity: ${it.quantity.trim()}${unitPart}`);
      }
      if (it.description?.trim()) {
        lines.push(`• Description: ${it.description.trim()}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

export function parseStringToItems(text: string): RequestItem[] {
  if (!text || !text.trim()) {
    return [
      { id: '1', category: 'New Material / Purchase', otherCategory: '', name: '', make: '', model: '', quantity: '', unit: 'Nos', customUnit: '', description: '' },
      { id: '2', category: 'New Material / Purchase', otherCategory: '', name: '', make: '', model: '', quantity: '', unit: 'Nos', customUnit: '', description: '' },
    ];
  }

  const itemPattern = /Item\s*(\d+)\s*:\s*([^\n]+)([\s\S]*?)(?=(?:Item\s*\d+\s*:)|$)/gi;
  const matches = Array.from(text.matchAll(itemPattern));

  if (matches.length > 0) {
    const parsed: RequestItem[] = matches.map((m, idx) => {
      const name = m[2]?.trim() || '';
      const body = m[3] || '';

      const catMatch = body.match(/•?\s*(?:Item\s*Type|Category\s*(?:\/\s*Type)?|Category|Type)\s*:\s*([^\n]+)/i);
      const makeMatch = body.match(/•?\s*Make\s*:\s*([^\n]+)/i);
      const modelMatch = body.match(/•?\s*Model\s*:\s*([^\n]+)/i);
      const makeModelCombined = body.match(/•?\s*(?:Make\s*(?:&|and)\s*Model)\s*:\s*([^\n]+)/i);
      const qtyMatch = body.match(/•?\s*(?:Quantity|Qty)\s*:\s*(\d+(?:\.\d+)?)\s*([^\n\r•]*)/i);
      const descMatch = body.match(/•?\s*Description\s*:\s*([\s\S]*?)(?=(?:•|$))/i);
      const specsMatch = body.match(/•?\s*(?:Specifications\s*(?:\/\s*Remarks)?|Specs|Remarks)\s*:\s*([^\n]+)/i);

      let category = 'New Material / Purchase';
      let otherCategory = '';
      if (catMatch) {
        const rawCat = catMatch[1]?.trim() || '';
        if (/Machinery/i.test(rawCat)) {
          category = 'New Machinery Purchase';
        } else if (/Service/i.test(rawCat)) {
          category = 'Service Requirement';
        } else if (/Spare/i.test(rawCat)) {
          category = 'Spare Parts';
        } else if (/Insurance/i.test(rawCat)) {
          category = 'Insurance';
        } else if (/Others?/i.test(rawCat)) {
          category = 'Others';
          const matchOther = rawCat.replace(/^Others?\s*[-:\(]?\s*/i, '').replace(/\)$/, '').trim();
          if (matchOther) otherCategory = matchOther;
        } else if (/Material|Purchase/i.test(rawCat)) {
          category = 'New Material Purchase';
        } else {
          category = 'Others';
          otherCategory = rawCat;
        }
      }

      let make = '';
      let model = '';
      if (makeMatch) make = makeMatch[1]?.trim() || '';
      if (modelMatch) model = modelMatch[1]?.trim() || '';
      if (!make && !model && makeModelCombined) {
        make = makeModelCombined[1]?.trim() || '';
      }

      let quantity = '';
      let unit = 'Nos';
      let customUnit = '';
      if (qtyMatch) {
        quantity = qtyMatch[1] || '';
        if (qtyMatch[2]) {
          const rawUnit = qtyMatch[2].trim();
          const match = (COMMON_UNITS as readonly string[]).find(
            (u) => u.toLowerCase() === rawUnit.toLowerCase()
          );
          if (match) {
            unit = match;
          } else if (rawUnit) {
            unit = 'Other';
            customUnit = rawUnit;
          }
        }
      }

      let description = '';
      if (descMatch) {
        description = descMatch[1]?.trim() || '';
      } else if (specsMatch) {
        description = specsMatch[1]?.trim() || '';
      }

      return {
        id: String(idx + 1),
        category,
        otherCategory,
        name: name === '(No Item Name)' || name === '(No description)' ? '' : name,
        make,
        model,
        quantity,
        unit: unit || 'Nos',
        customUnit,
        description,
      };
    });

    if (parsed.length === 1) {
      parsed.push({
        id: '2',
        category: 'New Material Purchase',
        otherCategory: '',
        name: '',
        make: '',
        model: '',
        quantity: '',
        unit: 'Nos',
        customUnit: '',
        description: '',
      });
    }
    return parsed;
  }

  return [
    { id: '1', category: 'New Material Purchase', otherCategory: '', name: text.trim(), make: '', model: '', quantity: '', unit: 'Nos', customUnit: '', description: '' },
    { id: '2', category: 'New Material Purchase', otherCategory: '', name: '', make: '', model: '', quantity: '', unit: 'Nos', customUnit: '', description: '' },
  ];
}

export default function RequestDescriptionInput({
  id = 'description',
  value,
  onChange,
  error,
  required = true,
}: RequestDescriptionInputProps) {
  const [items, setItems] = useState<RequestItem[]>(() => parseStringToItems(value));
  const isInternalUpdate = useRef(false);

  // Sync external value changes if not triggered internally
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (value) {
      setItems(parseStringToItems(value));
    }
  }, [value]);

  const updateItems = (newItems: RequestItem[]) => {
    setItems(newItems);
    isInternalUpdate.current = true;
    const formatted = formatItemsToString(newItems);
    onChange(formatted);
  };

  const handleItemChange = (
    index: number,
    fieldOrUpdates: keyof RequestItem | Partial<RequestItem>,
    val?: any
  ) => {
    const updates =
      typeof fieldOrUpdates === 'string'
        ? { [fieldOrUpdates]: val }
        : fieldOrUpdates;

    const updated = items.map((it, i) => {
      if (i !== index) return it;
      return {
        id: it.id || String(i + 1),
        category: it.category || 'New Material / Purchase',
        otherCategory: it.otherCategory || '',
        name: it.name || '',
        make: it.make || '',
        model: it.model || '',
        quantity: it.quantity || '',
        unit: it.unit || 'Nos',
        customUnit: it.customUnit || '',
        description: it.description || '',
        ...updates,
      };
    });
    updateItems(updated);
  };

  const addItem = () => {
    const nextId = String(Date.now());
    const updated = [
      ...items,
      {
        id: nextId,
        category: 'New Material Purchase',
        otherCategory: '',
        name: '',
        make: '',
        model: '',
        quantity: '',
        unit: 'Nos',
        customUnit: '',
        description: '',
      },
    ];
    updateItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index);
    updateItems(updated);
  };

  return (
    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Label Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <label className="form-label" htmlFor={id} style={{ margin: 0, fontWeight: 700, fontSize: 13.5 }}>
          Source Request Description {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Item-by-item Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, index) => {
          const itemNum = index + 1;
          const currentCategory = item.category || 'New Material / Purchase';

          return (
            <div
              key={item.id || index}
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              {/* Item Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 6,
                      background: index === 0 ? 'rgba(99,102,241,0.12)' : index === 1 ? 'rgba(14,165,233,0.12)' : 'rgba(16,185,129,0.12)',
                      color: index === 0 ? 'var(--accent)' : index === 1 ? 'var(--accent-secondary)' : 'var(--success)',
                      border: '1px solid currentColor',
                    }}
                  >
                    <Package size={13} />
                    Item {itemNum}
                  </span>
                  {index === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      (Primary Item)
                    </span>
                  )}
                  {index === 1 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      (Additional Item)
                    </span>
                  )}
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    title={`Remove Item ${itemNum}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 4,
                      opacity: 0.85,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                )}
              </div>

              {/* Item Type / Category Selection */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                  }}
                >
                  Item Type / Category <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ITEM_CATEGORIES.map((cat) => {
                    const isSelected = currentCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleItemChange(index, 'category', cat)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(99,102,241,0.12)' : 'var(--bg-hover)',
                          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {cat === 'New Material Purchase' && '📦'}
                        {cat === 'New Machinery Purchase' && '🏭'}
                        {cat === 'Service Requirement' && '🔧'}
                        {cat === 'Spare Parts' && '⚙️'}
                        {cat === 'Insurance' && '🛡️'}
                        {cat === 'Others' && '📋'}
                        {cat}
                      </button>
                    );
                  })}
                </div>
                {currentCategory === 'New Machinery Purchase' && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(245, 158, 11, 0.10)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: '#f59e0b',
                      fontWeight: 600,
                    }}
                  >
                    <span>📄</span>
                    <span>Mandatory: A <strong>URS (User Requirement Specification)</strong> document must be attached.</span>
                  </div>
                )}
                {currentCategory === 'Others' && (
                  <input
                    type="text"
                    className="form-input"
                    style={{ marginTop: 8, fontSize: 12.5 }}
                    placeholder="Specify other type / category details..."
                    value={item.otherCategory || ''}
                    onChange={(e) => handleItemChange(index, 'otherCategory', e.target.value)}
                  />
                )}
              </div>

              {/* Item Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 4,
                  }}
                >
                  Item Name {index === 0 && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`e.g., ${
                    index === 0
                      ? 'Laptop / Desktop Monitor / Safety Shoes / Maintenance Service'
                      : index === 1
                      ? 'Wireless Mouse / Docking Station / Spare Filters'
                      : `Item ${itemNum} Name`
                  }`}
                  value={item.name || ''}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </div>

              {/* Row: Make & Model as Separate Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 4,
                    }}
                  >
                    Make
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Dell, HP, Bata, Godrej, Canon"
                    value={item.make || ''}
                    onChange={(e) => handleItemChange(index, 'make', e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 4,
                    }}
                  >
                    Model
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Latitude 5440, EliteBook 840, LBP2900"
                    value={item.model || ''}
                    onChange={(e) => handleItemChange(index, 'model', e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Row: Quantity and Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 4,
                    }}
                  >
                    Quantity
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 10"
                    value={item.quantity || ''}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 4,
                    }}
                  >
                    Unit
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="form-input form-select"
                      value={
                        (COMMON_UNITS as readonly string[]).includes(item.unit)
                          ? item.unit
                          : 'Other'
                      }
                      onChange={(e) => {
                        const chosen = e.target.value;
                        if (chosen === 'Other') {
                          handleItemChange(index, {
                            unit: 'Other',
                            customUnit:
                              item.customUnit ||
                              ((COMMON_UNITS as readonly string[]).includes(item.unit)
                                ? ''
                                : item.unit),
                          });
                        } else {
                          handleItemChange(index, {
                            unit: chosen,
                            customUnit: '',
                          });
                        }
                      }}
                      style={{ fontSize: 13 }}
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {(item.unit === 'Other' ||
                      (!(COMMON_UNITS as readonly string[]).includes(item.unit) &&
                        Boolean(item.unit))) && (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Specify custom unit (e.g. Sq. Ft, Ton)..."
                        value={item.customUnit || (item.unit === 'Other' ? '' : item.unit)}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleItemChange(index, {
                            unit: val || 'Other',
                            customUnit: val,
                          });
                        }}
                        style={{ marginTop: 6, fontSize: 12.5 }}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Spacious Description Textarea */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                  }}
                >
                  Description / Specifications
                </label>

                <textarea
                  rows={3}
                  className="form-input"
                  placeholder={`Describe detailed specifications, dimensions, features, or requirements for Item ${itemNum}...`}
                  value={item.description || ''}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  style={{
                    fontSize: 12.5,
                    resize: 'vertical',
                    lineHeight: 1.6,
                    minHeight: 80,
                    padding: '10px 12px',
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Add Another Item Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            type="button"
            onClick={addItem}
            className="btn btn-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--accent)',
              border: '1px dashed var(--border-brand)',
              background: 'rgba(99,102,241,0.04)',
              padding: '8px 16px',
              borderRadius: 8,
            }}
          >
            <Plus size={14} />
            Add Another Item (Item {items.length + 1})
          </button>
        </div>
      </div>

      {error && (
        <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2, display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
}
