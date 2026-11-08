export type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
};

const SAME_LINE_TOLERANCE = 2.5;
const COLUMN_GAP = 12;

/**
 * Groups positioned PDF text runs into reading-order lines.
 * Runs far apart on one line (table cells, label/value columns) are joined
 * with " | " so the parser can still tell the cells apart.
 */
export function itemsToLines(items: TextItem[]): string[] {
  const rows: { y: number; items: TextItem[] }[] = [];

  items
    .filter((item) => item.str.trim() !== '')
    .forEach((item) => {
      const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= SAME_LINE_TOLERANCE);
      if (row) row.items.push(item);
      else rows.push({ y: item.y, items: [item] });
    });

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => {
      const sorted = row.items.sort((a, b) => a.x - b.x);
      let line = '';
      let lastEnd = -Infinity;
      sorted.forEach((item) => {
        const gap = item.x - lastEnd;
        if (line) line += gap > COLUMN_GAP ? ' | ' : gap > 1 ? ' ' : '';
        line += item.str.trim();
        lastEnd = item.x + item.width;
      });
      return line.replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean);
}

type PdfJs = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJs> | null = null;

async function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsPromise;
}

export async function openPdf(data: ArrayBuffer) {
  const pdfjs = await loadPdfJs();
  return pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
}

/** Extracts text lines from every page of a PDF. */
export async function extractPdfLines(data: ArrayBuffer): Promise<string[]> {
  const pdf = await openPdf(data);
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items.flatMap((item) =>
      'str' in item
        ? [{ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width }]
        : [],
    );
    lines.push(...itemsToLines(items));
  }

  return lines;
}
