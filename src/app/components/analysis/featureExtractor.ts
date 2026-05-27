export interface UrlFeature {
  name: string;
  value: number;       // 0.0 – 1.0 (normalized importance)
  description: string;
  color: string;       // warna untuk visualisasi
}

export function extractFeatures(url: string): UrlFeature[] {
  const features: UrlFeature[] = [
    {
      name: 'URL Length',
      value: Math.min(url.length / 200, 1.0),
      description: `Panjang URL: ${url.length} karakter`,
      color: url.length > 100 ? '#ff3b3b' : '#00ff9d',
    },
    {
      name: 'Special Chars',
      value: Math.min((url.match(/[@\-_~]/g)?.length ?? 0) / 10, 1.0),
      description: `Karakter khusus: ${url.match(/[@\-_~]/g)?.length ?? 0}`,
      color: (url.match(/[@\-_~]/g)?.length ?? 0) > 3 ? '#ff3b3b' : '#00ff9d',
    },
    {
      name: 'Suspicious Keywords',
      value: /login|secure|bank|verify|account|update|password|confirm|paypal|ebay/i.test(url) ? 0.9 : 0.1,
      description: /login|secure|bank|verify|account|update|password|confirm|paypal|ebay/i.test(url)
        ? 'Kata kunci mencurigakan ditemukan'
        : 'Tidak ada kata kunci mencurigakan',
      color: /login|secure|bank|verify|account|update|password|confirm|paypal|ebay/i.test(url) ? '#ff3b3b' : '#00ff9d',
    },
    {
      name: 'Subdomain Count',
      value: Math.min(((url.match(/\./g)?.length ?? 0) - 1) / 5, 1.0),
      description: `Subdomain: ${Math.max((url.match(/\./g)?.length ?? 0) - 1, 0)}`,
      color: (url.match(/\./g)?.length ?? 0) > 3 ? '#ff3b3b' : '#00ff9d',
    },
    {
      name: 'HTTPS',
      value: url.startsWith('https://') ? 0.1 : 0.85,
      description: url.startsWith('https://') ? 'Menggunakan HTTPS ✓' : 'Tidak menggunakan HTTPS ✗',
      color: url.startsWith('https://') ? '#00ff9d' : '#ff3b3b',
    },
  ];
  return features;
}

// Heatmap: assign risk score per character
export function getCharacterRiskScores(url: string): number[] {
  const suspiciousPatterns = [
    { pattern: /[@]/g, score: 0.9 },
    { pattern: /login|secure|bank|verify|account|update|password/gi, score: 0.85 },
    { pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, score: 0.95 }, // IP address
    { pattern: /[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, score: 0.7 },
  ];

  const scores = new Array(url.length).fill(0.1);

  suspiciousPatterns.forEach(({ pattern, score }) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(url)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i++) {
        scores[i] = Math.max(scores[i], score);
      }
    }
  });

  return scores;
}
