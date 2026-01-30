/**
 * Type definitions for use-sound library
 */
declare module "use-sound" {
    export interface HookOptions {
        volume?: number;
        playbackRate?: number;
        interrupt?: boolean;
        soundEnabled?: boolean;
        sprite?: Record<string, [number, number]>;
        onload?: () => void;
        onend?: () => void;
        onstop?: () => void;
        onpause?: () => void;
        onplayerror?: () => void;
        onloaderror?: () => void;
    }

    export interface PlayFunction {
        (options?: { id?: string; forceSoundEnabled?: boolean }): void;
    }

    export interface ExposedData {
        sound: any | null;
        stop: () => void;
        pause: () => void;
        duration: number | null;
    }

    export type ReturnedValue = [PlayFunction, ExposedData];

    export default function useSound(src: string | string[], options?: HookOptions): ReturnedValue;
}

/**
 * Type declarations for audio file imports
 */
declare module "*.mp3" {
    const src: string;
    export default src;
}

declare module "*.wav" {
    const src: string;
    export default src;
}

declare module "*.ogg" {
    const src: string;
    export default src;
}
