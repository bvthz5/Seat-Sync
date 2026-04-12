const fs = require('fs');

const riskPath = 'src/apps/admin/components/security/RiskAlertsPanel.tsx';
let risk = fs.readFileSync(riskPath, 'utf8');
risk = risk.replace('const alerts = [];', 'const alerts: any[] = [];');
fs.writeFileSync(riskPath, risk);

const notifPath = 'src/apps/admin/components/notifications/CreateNotification.tsx';
let notif = fs.readFileSync(notifPath, 'utf8');
notif = notif.replace(/let apiTargetId = null;/g, 'let apiTargetId: string | null = null;');
fs.writeFileSync(notifPath, notif);

const layoutPath = 'src/apps/admin/components/structure/LayoutConfig.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');
layout = layout.replace('let parsedRowLayout = room.RowLayout;', 'let parsedRowLayout = (room as any).RowLayout;');
layout = layout.replace('RowLayout: config.rowLayout,', 'RowLayout: config.rowLayout as any,');
fs.writeFileSync(layoutPath, layout);

console.log('Fixed typings!');