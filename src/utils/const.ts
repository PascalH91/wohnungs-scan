/**
 * @deprecated Use config from '@/config' instead
 * These exports are kept for backward compatibility during migration
 */
import { config } from "@/config";

export const minRoomSize = config.apartment.minRoomSize;
export const minRoomNumber = config.apartment.minRoomNumber;
export const maxColdRent = config.apartment.maxColdRent;
export const maxWarmRent = config.apartment.maxWarmRent;
