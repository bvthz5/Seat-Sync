const fs = require('fs');
let content = fs.readFileSync('src/apps/admin/components/structure/LayoutConfig.tsx', 'utf8');
content = content.replace(/await structureService\.updateRoom\(roomId, {/, 'await structureService.updateRoom(roomId, {');
content = content.replace(/RowLayout: config\.rowLayout as any,/g, 'RowLayout: config.rowLayout,');
content = content.replace(/await structureService\.(updateRoom|updateRoomLayout)\(Number\(selectedRoomId\), \{\s*\.\.\.room,\s*RowLayout: config\.rowLayout,/g, 'await structureService.updateRoomLayout(Number(selectedRoomId), { ...room, RowLayout: config.rowLayout as any,');
content = content.replace(/LayoutType: 'CUSTOM',\s*RowLayout: config\.rowLayout,\s*SeatsPerBench: config\.seatsPerBench/g, "LayoutType: 'CUSTOM',\n                RowLayout: config.rowLayout as any,\n                SeatsPerBench: config.seatsPerBench");
content = content.replace(/structureService\.updateRoom\(roomId, \{([\s\S]*?)SeatsPerBench: config\.seatsPerBench\s*\}/g, "structureService.updateRoom(roomId, {$1SeatsPerBench: config.seatsPerBench\n            } as any");
fs.writeFileSync('src/apps/admin/components/structure/LayoutConfig.tsx', content);