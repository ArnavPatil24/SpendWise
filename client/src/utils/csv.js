const escapeCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function transactionsToCsv(transactions, base) {
  const headers = ['Date', 'Title', 'Type', 'Category', 'Amount', 'Currency', `Converted amount (${base})`, 'Note'];
  const rows = transactions.map(t => [
    new Date(t.date).toISOString().split('T')[0],
    t.title,
    t.type,
    t.category,
    t.amount,
    t.currency,
    t.convertedAmount,
    t.note
  ]);
  return [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n');
}

export function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const today = () => new Date().toISOString().split('T')[0];
