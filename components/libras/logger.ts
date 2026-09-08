/**
 * EchoMind Libras — Structured Debug Logger
 * 
 * Provides unified, structured logging for the Libras pipeline:
 * Camera -> MediaPipe -> Landmarks -> Features -> Sequence -> Classifier -> Prediction
 * 
 * Can be enabled/disabled via localStorage ('echomind_libras_debug' = 'true'/'false')
 * or via process.env.NODE_ENV.
 */

class LibrasLogger {
  private enabled: boolean;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage?.getItem('echomind_libras_debug');
      this.enabled = stored !== null ? stored === 'true' : process.env.NODE_ENV !== 'production';
    } else {
      this.enabled = process.env.NODE_ENV !== 'production';
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('echomind_libras_debug', val ? 'true' : 'false');
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public log(stage: string, detail?: any) {
    if (!this.enabled) return;
    if (detail !== undefined) {
      console.log(`[EchoMind Libras] ${stage}:`, detail);
    } else {
      console.log(`[EchoMind Libras] ${stage}`);
    }
  }

  public info(stage: string, detail?: any) {
    if (!this.enabled) return;
    console.info(`[EchoMind Libras] ${stage}:`, detail ?? 'OK');
  }

  public warn(stage: string, detail?: any) {
    console.warn(`[EchoMind Libras] ${stage}:`, detail);
  }

  public error(stage: string, detail?: any) {
    console.error(`[EchoMind Libras] ${stage}:`, detail);
  }
}

export const librasLogger = new LibrasLogger();
