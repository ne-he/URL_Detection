import { afterEach, describe, expect, it, vi } from 'vitest';

// config.ts membaca import.meta.env saat modul dievaluasi, jadi tiap skenario harus
// meng-import ulang modulnya setelah env di-stub.
async function loadConfig(apiBase?: string) {
  vi.resetModules();
  if (apiBase === undefined) {
    vi.stubEnv('VITE_API_BASE', undefined as unknown as string);
  } else {
    vi.stubEnv('VITE_API_BASE', apiBase);
  }
  return import('./config');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('API_BASE', () => {
  // Regression yang dikunci: pernah default-nya menunjuk Space milik kolaborator v1.
  // Build produksi tanpa env jadi mengirim URL pengunjung ke backend orang lain dan
  // menjalankan model v1, sementara UI-nya kelihatan normal. Kegagalan diam-diam
  // seperti itu tidak boleh bisa masuk lagi tanpa test ini merah.
  it('default-nya menunjuk backend milik repo ini, bukan host pihak ketiga', async () => {
    const { API_BASE } = await loadConfig(undefined);
    expect(API_BASE).toBe('https://ne-he-phisguard-api.hf.space');
    expect(API_BASE).not.toContain('adhikaxx88');
  });

  it('memakai VITE_API_BASE kalau di-set', async () => {
    const { API_BASE } = await loadConfig('http://localhost:7860');
    expect(API_BASE).toBe('http://localhost:7860');
  });

  // Vercel mengirim '' untuk env var yang didefinisikan tapi dibiarkan kosong.
  // '' bukan null/undefined sehingga lolos dari `??`, dan hasilnya fetch ke path
  // relatif yang selalu 404 di produksi.
  it('menganggap env kosong atau spasi sebagai tidak di-set', async () => {
    expect((await loadConfig('')).API_BASE).toBe('https://ne-he-phisguard-api.hf.space');
    expect((await loadConfig('   ')).API_BASE).toBe('https://ne-he-phisguard-api.hf.space');
  });

  it('membuang trailing slash supaya `${API_BASE}/predict` tidak jadi //predict', async () => {
    const { API_BASE } = await loadConfig('https://contoh.hf.space///');
    expect(API_BASE).toBe('https://contoh.hf.space');
  });
});
