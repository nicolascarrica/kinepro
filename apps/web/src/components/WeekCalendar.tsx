'use client';

import { useMemo, useState } from 'react';

export interface CalendarSlot {
  id: string;
  startsAt: string;
  cupo: number;
  ocupados: number;
  cancelado: boolean;
  // datos extra que cada vista quiera mostrar
  [k: string]: any;
}

interface Props<T extends CalendarSlot> {
  slots: T[];
  /**
   * Renderiza el contenido de la celda. Si retorna null, la celda
   * queda vacia (sin slot).
   */
  renderCell: (slot: T | null) => React.ReactNode;
  onSlotClick?: (slot: T) => void;
  /**
   * Rango horario de la grilla (default 7..20).
   */
  horaInicio?: number;
  horaFin?: number;
  /**
   * Fecha inicial (lunes). Si no se pasa, arranca el lunes de la
   * semana actual.
   */
  desdeLunes?: Date;
}

const DIAS_LABEL = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'];

export function WeekCalendar<T extends CalendarSlot>({
  slots,
  renderCell,
  onSlotClick,
  horaInicio = 7,
  horaFin = 20,
  desdeLunes,
}: Props<T>) {
  const [semana, setSemana] = useState<Date>(() => {
    const d = desdeLunes ?? new Date();
    return getMonday(d);
  });

  // Indexar slots por (dia=0..4, hora) para acceso O(1).
  const indexed = useMemo(() => {
    const map = new Map<string, T>();
    for (const s of slots) {
      const d = new Date(s.startsAt);
      const dia = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=lun..6=dom
      if (dia < 0 || dia > 4) continue;
      const hora = d.getHours();
      const sameWeek = isSameWeek(d, semana);
      if (!sameWeek) continue;
      map.set(`${dia}|${hora}`, s);
    }
    return map;
  }, [slots, semana]);

  const horas = useMemo(() => {
    const out: number[] = [];
    for (let h = horaInicio; h <= horaFin; h++) out.push(h);
    return out;
  }, [horaInicio, horaFin]);

  const fechasDia = useMemo(() => {
    return DIAS_LABEL.map((_, i) => {
      const d = new Date(semana);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [semana]);

  function nav(diff: number) {
    const next = new Date(semana);
    next.setDate(next.getDate() + diff * 7);
    setSemana(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button className="btn-outline text-sm" onClick={() => nav(-1)}>
          ← Semana anterior
        </button>
        <div className="text-sm text-neutral-gray">
          Semana del{' '}
          <strong className="text-kineblue-deep">
            {fechasDia[0].toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
            })}
          </strong>{' '}
          al{' '}
          <strong className="text-kineblue-deep">
            {fechasDia[4].toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
            })}
          </strong>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-outline text-sm"
            onClick={() => setSemana(getMonday(new Date()))}
          >
            Hoy
          </button>
          <button className="btn-outline text-sm" onClick={() => nav(1)}>
            Semana siguiente →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-kineblue-light/30 text-kineblue-deep">
            <tr>
              <th className="text-left px-3 py-2 w-20">Hora</th>
              {fechasDia.map((d, i) => (
                <th key={i} className="text-left px-3 py-2 capitalize">
                  <div className="font-semibold">{DIAS_LABEL[i]}</div>
                  <div className="text-xs text-neutral-gray font-normal">
                    {d.toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horas.map((h) => (
              <tr key={h} className="border-t">
                <td className="px-3 py-2 text-neutral-gray text-xs font-medium align-top">
                  {String(h).padStart(2, '0')}:00
                </td>
                {DIAS_LABEL.map((_, dia) => {
                  const slot = indexed.get(`${dia}|${h}`) ?? null;
                  const clickable = slot && onSlotClick;
                  return (
                    <td
                      key={dia}
                      className={`px-2 py-1 align-top border-l border-neutral-100 ${
                        clickable
                          ? 'cursor-pointer hover:bg-kineblue-light/10'
                          : ''
                      }`}
                      onClick={() => slot && onSlotClick && onSlotClick(slot)}
                    >
                      {renderCell(slot as T | null)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getMonday(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day; // domingo -> retroceder 6, otros -> al lunes
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isSameWeek(d: Date, lunes: Date) {
  const s = new Date(lunes);
  s.setHours(0, 0, 0, 0);
  const e = new Date(s);
  e.setDate(e.getDate() + 5);
  return d >= s && d < e;
}
