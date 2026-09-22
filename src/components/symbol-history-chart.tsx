import { ChartWorkspace } from './chart-workspace';
export function SymbolHistoryChart({ symbol, name }: { symbol: string; name: string }) {
  return <ChartWorkspace symbol={symbol} compact/>;
}
