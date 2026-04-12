import React from 'react';
import { Card, CardBody, CardHeader, Divider } from '@nextui-org/react';

interface Seat {
  SeatID: number;
  RowIndex: number;
  BenchIndex: number;
  SeatIndex: number;
  IsActive?: boolean;
}

interface Room {
  RoomID: number;
  RoomCode: string;
  Capacity: number;
  RowLayout: number[];
  SeatsPerBench: number;
}

interface RoomLayoutProps {
  room: Room;
  seats: Seat[];
}

export const RoomLayoutMap: React.FC<RoomLayoutProps> = ({ room, seats }) => {
  // Determine if we have any valid seats to display
  const hasSeats = seats && seats.length > 0;

  return (
    <Card className="w-full h-full min-h-[400px] border-none shadow-sm relative overflow-hidden bg-slate-50">
      <CardHeader className="flex flex-col items-start px-6 pt-6 pb-2">
        <div className="flex w-full justify-between items-center mb-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Room Visualizer: {room.RoomCode}</h3>
            <p className="text-sm text-slate-500 font-medium">Capacity: {room.Capacity} Seats | {room.RowLayout?.length} Rows</p>
          </div>
        </div>
      </CardHeader>
      <Divider className="bg-slate-200/50" />
      <CardBody className="p-8">
        <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-8 shadow-inner overflow-auto">
          {!hasSeats && (
            <div className="text-slate-400 font-medium flex flex-col items-center">
              <span>No active physical layout generated yet.</span>
            </div>
          )}

          {hasSeats && (
            <div className="flex flex-col gap-8 w-max mx-auto p-4 items-center relative">
              {/* Teacher Desk / Front of Room Marker */}
              <div className="w-64 h-12 bg-slate-200 rounded-xl flex items-center justify-center mb-8 border-b-4 border-slate-300">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Blackboard / Podium</span>
              </div>

              <div className="flex gap-12 w-full justify-center">
                {room.RowLayout.map((benchesInRow, rowIndex) => {
                  if (benchesInRow === 0) {
                    return <div key={`empty-row-${rowIndex}`} className="w-16 border-r-2 border-dashed border-slate-200" />;
                  }

                  const rowSeats = seats.filter((s) => s.RowIndex === rowIndex);

                  return (
                    <div key={`row-${rowIndex}`} className="flex flex-col gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 bg-white px-3 py-1 rounded-full shadow-sm">
                        Row {String.fromCharCode(65 + rowIndex)}
                      </div>

                      {Array.from({ length: benchesInRow }).map((_, bIdx) => {
                        const benchIndex = bIdx + 1;
                        const benchSeats = rowSeats.filter((s) => s.BenchIndex === benchIndex).sort((a, b) => a.SeatIndex - b.SeatIndex);

                        return (
                          <div key={`bench-${rowIndex}-${benchIndex}`} className="flex gap-2 p-2 bg-indigo-100 rounded-lg border border-indigo-200 shadow-sm relative group hover:border-indigo-400 transition-colors">
                            {/* Desk Visual */}
                            <div className="absolute -top-1 left-2 right-2 h-2 bg-indigo-200/50 rounded-t-md" />
                            
                            {benchSeats.map((seat) => (
                              <div
                                key={seat.SeatID}
                                className={`w-10 h-10 rounded-md flex items-center justify-center font-semibold text-xs shadow-sm transition-all duration-200 
                                  ${seat.IsActive ? 'bg-white text-indigo-700 ring-1 ring-indigo-200 group-hover:ring-indigo-400' : 'bg-slate-200 text-slate-400 ring-1 ring-slate-300 line-through'}
                                `}
                                title={`Row ${rowIndex}, Bench ${benchIndex}, Seat ${seat.SeatIndex}`}
                              >
                                {seat.SeatIndex}
                              </div>
                            ))}
                            {benchSeats.length === 0 && (
                              <div className="w-24 border border-dashed border-red-300 text-red-500 text-[10px] flex items-center justify-center bg-red-50/50 p-2 rounded-md font-medium">Missing Generated Seats</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
