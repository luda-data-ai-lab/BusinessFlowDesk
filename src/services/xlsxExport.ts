import { saveAs } from 'file-saver';
import type { Language } from '../i18n';
import { fileStem } from './export';
import { MAX_SCENARIOS, stepText, ts, type ScenarioSuite } from './testScenarios';

const HEADER_FILL = '2563EB';
const COVER_FILL = '7C3AED';

export async function exportScenariosAsXlsx(suite: ScenarioSuite, lang: Language) {
  const { Workbook } = await import('exceljs');
  const wb = new Workbook();
  wb.creator = 'BusinessFlowDesk';

  const header = (
    sheet: import('exceljs').Worksheet,
    cols: Array<{ header: string; key: string; width: number }>,
    fill: string,
  ) => {
    sheet.columns = cols;
    const row = sheet.getRow(1);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fill}` } };
    row.alignment = { vertical: 'middle' };
    row.height = 22;
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  };

  const ws = wb.addWorksheet(ts('sheetScenarios', lang));
  header(
    ws,
    [
      { header: ts('id', lang), key: 'id', width: 10 },
      { header: ts('name', lang), key: 'name', width: 34 },
      { header: ts('kind', lang), key: 'kind', width: 12 },
      { header: ts('preconditions', lang), key: 'pre', width: 36 },
      { header: ts('steps', lang), key: 'steps', width: 60 },
      { header: ts('expected', lang), key: 'expected', width: 36 },
      { header: ts('systems', lang), key: 'systems', width: 24 },
      { header: ts('departments', lang), key: 'departments', width: 20 },
      { header: ts('decisions', lang), key: 'choices', width: 30 },
      { header: ts('stepCount', lang), key: 'count', width: 10 },
    ],
    HEADER_FILL,
  );
  for (const sc of suite.scenarios) {
    const row = ws.addRow({
      id: sc.id,
      name: sc.name,
      kind: sc.kind === 'main' ? ts('mainFlow', lang) : ts('altFlow', lang),
      pre: sc.preconditions.join('\n'),
      steps: sc.steps.map((st) => stepText(st, lang)).join('\n'),
      expected: sc.expected,
      systems: sc.systems.join(', '),
      departments: sc.departments.join(', '),
      choices: sc.choices.map((c) => `${c.decision} = ${c.option}`).join('\n'),
      count: sc.steps.length,
    });
    row.alignment = { vertical: 'top', wrapText: true };
  }
  if (suite.truncated) {
    ws.addRow({ name: ts('truncated', lang).replace('{n}', String(MAX_SCENARIOS)) }).font = {
      italic: true,
      color: { argb: 'FF991B1B' },
    };
  }

  const cov = wb.addWorksheet(ts('sheetCoverage', lang));
  header(
    cov,
    [
      { header: ts('kind', lang), key: 'kind', width: 14 },
      { header: `${ts('decision', lang)} / ${ts('system', lang)}`, key: 'item', width: 36 },
      { header: ts('option', lang), key: 'option', width: 20 },
      { header: ts('tcCount', lang), key: 'count', width: 10 },
      { header: ts('coveredBy', lang), key: 'ids', width: 40 },
    ],
    COVER_FILL,
  );
  for (const b of suite.branches) {
    const row = cov.addRow({
      kind: ts('decision', lang),
      item: b.decision,
      option: b.option,
      count: b.scenarioIds.length,
      ids: b.scenarioIds.join(', ') || '—',
    });
    if (b.scenarioIds.length === 0) row.font = { color: { argb: 'FF991B1B' } };
  }
  for (const sys of suite.systems) {
    cov.addRow({
      kind: ts('system', lang),
      item: sys.system,
      option: '',
      count: sys.scenarioIds.length,
      ids: sys.scenarioIds.join(', '),
    });
  }
  const covered = suite.branches.filter((b) => b.scenarioIds.length > 0).length;
  cov.addRow({});
  cov.addRow({
    kind: ts('summary', lang),
    item: ts('totalTcs', lang),
    count: suite.scenarios.length,
  }).font = { bold: true };
  if (suite.branches.length) {
    cov.addRow({
      kind: ts('summary', lang),
      item: ts('branchCoverage', lang),
      option: `${covered} / ${suite.branches.length}`,
      count: Math.round((covered / suite.branches.length) * 100) / 100,
    }).font = { bold: true };
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${fileStem(suite.title || 'flow')}-test-scenarios.xlsx`,
  );
}
