export type RateConSource = { name: string; data: ArrayBuffer };

export function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export async function readSource(file: File): Promise<RateConSource> {
  return { name: file.name, data: await file.arrayBuffer() };
}
