export interface ChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

export interface ChartDataPayload {
  title: string;
  subtitle?: string;
  type: 'area' | 'line' | 'bar' | 'pie' | 'radar';
  data: Record<string, any>[];
  xAxisKey: string;
  series: ChartSeries[];
  unit?: string;
  summary?: {
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
}

const PALETTE = [
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#14b8a6', // teal-500
];

/**
 * Extracts explicit [[DATA_CHART:...]] tags or auto-detects structured numerical trend/comparison tables from markdown text.
 */
export function detectChartData(content: string): ChartDataPayload | null {
  if (!content) return null;

  // 1. Check for explicit JSON tag: [[DATA_CHART:{...}]]
  const explicitMatch = content.match(/\[\[DATA_CHART:([\s\S]*?)\]\]/);
  if (explicitMatch && explicitMatch[1]) {
    try {
      const parsed = JSON.parse(explicitMatch[1]);
      if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
        return {
          title: parsed.title || 'Data Analytics & Trends',
          subtitle: parsed.subtitle,
          type: parsed.type || 'bar',
          data: parsed.data,
          xAxisKey: parsed.xAxisKey || Object.keys(parsed.data[0])[0] || 'name',
          series: parsed.series || Object.keys(parsed.data[0])
            .filter(k => k !== (parsed.xAxisKey || Object.keys(parsed.data[0])[0]))
            .map((k, i) => ({
              dataKey: k,
              name: k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
              color: PALETTE[i % PALETTE.length]
            })),
          unit: parsed.unit,
          summary: parsed.summary
        };
      }
    } catch (e) {
      console.warn('Failed to parse explicit DATA_CHART tag:', e);
    }
  }

  // 2. Auto-detect Markdown Tables with numerical series (at least 3 rows and 1 numeric column)
  const lines = content.split('\n');
  const tableLines: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableLines.push(trimmed);
      inTable = true;
    } else if (inTable) {
      if (tableLines.length >= 4) break; // found a table
      tableLines.length = 0;
      inTable = false;
    }
  }

  if (tableLines.length >= 4) {
    const headers = tableLines[0]
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);

    // Skip separator line (tableLines[1])
    const rows = tableLines.slice(2).map(line => 
      line.split('|').map(c => c.trim()).filter(Boolean)
    );

    if (headers.length >= 2 && rows.length >= 2) {
      // Find numeric columns
      const numericColIndices: number[] = [];
      headers.forEach((_, colIdx) => {
        if (colIdx === 0) return; // Usually x-axis label
        const isNumeric = rows.some(r => {
          const val = (r[colIdx] || '').replace(/[\$,%BMkK\s]/g, '');
          return !isNaN(parseFloat(val)) && isFinite(parseFloat(val));
        });
        if (isNumeric) numericColIndices.push(colIdx);
      });

      if (numericColIndices.length > 0) {
        const xAxisKey = headers[0];
        const data = rows.map(row => {
          const item: Record<string, any> = { [xAxisKey]: row[0] };
          numericColIndices.forEach(colIdx => {
            const rawVal = row[colIdx] || '0';
            const cleanVal = parseFloat(rawVal.replace(/[\$,%BMkK\s]/g, ''));
            item[headers[colIdx]] = isNaN(cleanVal) ? 0 : cleanVal;
          });
          return item;
        });

        const isTimeSeries = rows.some(r => 
          /\b(20\d\d|19\d\d|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Q[1-4]|Month|Year|Day)\b/i.test(r[0])
        );

        return {
          title: isTimeSeries ? 'Trend Analytics' : 'Comparative Analytics',
          subtitle: `Visualizing ${rows.length} data points across ${numericColIndices.length} metric(s)`,
          type: isTimeSeries ? 'area' : 'bar',
          data,
          xAxisKey,
          series: numericColIndices.map((colIdx, i) => ({
            dataKey: headers[colIdx],
            name: headers[colIdx],
            color: PALETTE[i % PALETTE.length]
          }))
        };
      }
    }
  }

  return null;
}
