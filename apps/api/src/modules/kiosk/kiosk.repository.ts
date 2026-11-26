import { sql } from 'kysely';
import { db } from '../../services/database.service';

// Queries only the kiosk uses. Menu and orders come from src/pipeline/.

/** First print only — a reprint keeps the original time. */
export const markSlipPrinted = (orderId: number) =>
    db.updateTable('orders').set({ slip_printed_at: sql`COALESCE(slip_printed_at, NOW())` }).where('id', '=', orderId).execute();
