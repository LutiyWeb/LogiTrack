import { useEffect, useRef, useState } from 'react';
import { openPdf } from '../../ratecon/pdfText';

/** Renders every page of a PDF into canvases that fit the container width. */
function PdfPreview({ data, fileName }: { data: ArrayBuffer; fileName: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    host.replaceChildren();

    openPdf(data)
      .then(async (pdf) => {
        const width = host.clientWidth || 480;
        const ratio = window.devicePixelRatio || 1;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement('canvas');
          canvas.className = 'ratecon__page';
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${width}px`;
          canvas.setAttribute('aria-label', `${fileName}, page ${pageNumber}`);
          host.append(canvas);
          await page.render({ canvas, viewport }).promise;
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [data, fileName]);

  return (
    <div className="ratecon__preview">
      {failed && <p className="ratecon__preview-error">Preview is not available for this file.</p>}
      <div ref={hostRef} className="ratecon__pages" />
    </div>
  );
}

export default PdfPreview;
