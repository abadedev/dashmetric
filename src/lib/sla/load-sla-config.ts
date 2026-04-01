import { db } from '@/lib/db';
import { slaConfig } from '@/lib/db/schema';
import { type BusinessHours, DEFAULT_BUSINESS_HOURS } from './calculate-sla';

/**
 * Carrega o horário comercial da tabela sla_config.
 * Retorna os valores padrão para chaves ausentes.
 */
export async function loadBusinessHours(): Promise<BusinessHours> {
  try {
    const rows = await db.select().from(slaConfig);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return {
      weekdayOpen:     parseInt(map['weekday_open']     ?? String(DEFAULT_BUSINESS_HOURS.weekdayOpen),     10),
      weekdayClose:    parseInt(map['weekday_close']    ?? String(DEFAULT_BUSINESS_HOURS.weekdayClose),    10),
      saturdayEnabled: (map['saturday_enabled'] ?? String(DEFAULT_BUSINESS_HOURS.saturdayEnabled)) === 'true',
      saturdayOpen:    parseInt(map['saturday_open']    ?? String(DEFAULT_BUSINESS_HOURS.saturdayOpen),    10),
      saturdayClose:   parseInt(map['saturday_close']   ?? String(DEFAULT_BUSINESS_HOURS.saturdayClose),   10),
      sundayEnabled:   (map['sunday_enabled']   ?? String(DEFAULT_BUSINESS_HOURS.sundayEnabled))   === 'true',
    };
  } catch {
    // fallback se a tabela ainda não existir (antes da migration)
    return { ...DEFAULT_BUSINESS_HOURS };
  }
}
