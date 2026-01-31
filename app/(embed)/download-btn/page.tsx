'use client';

import { EmbedShell } from '../_shared/EmbedShell';

export default function DownloadButtonPage() {
  const handleDownload = async () => {
    const imageUrl =
      'https://assets.poweredbybackstage.com/sm8178e45f-2c42-48e3-945a-937dc2a94b10/36d1e330-19de-4ecc-a69e-e5c6d3d32da2.jpeg';
    const fileName = 'Shavon_Lloyd.jpg';

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[download] failed:', err);
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <EmbedShell title="Download Button">
      <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Download Button embed
        </div>

        <button
          type="button"
          onClick={handleDownload}
          style={{
            padding: '12px 16px',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 6,
            border: '1px solid #ccc',
          }}
        >
          DOWNLOAD IMAGE
        </button>
      </div>
    </EmbedShell>
  );
}
