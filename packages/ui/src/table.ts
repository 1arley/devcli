import Table from 'cli-table3'
import chalk from 'chalk'

export type TableColumn = string
export type TableRow = Record<string, string | number>

export function createTable(headers: TableColumn[], rows: TableRow[]): Table.Table {
  const table = new Table({
    head: headers.map((h) => chalk.cyan(h)),
    style: { head: [], border: ['gray'] },
  })

  for (const row of rows) {
    table.push(headers.map((h) => String(row['' + h] ?? '')))
  }

  return table
}

export { Table }
