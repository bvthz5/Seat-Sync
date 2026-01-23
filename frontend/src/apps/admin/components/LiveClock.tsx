import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { Clock } from 'lucide-react';

export const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    return (
        <Button
            startContent={<Clock size={16} className="text-blue-600" />}
            variant="flat"
            radius="full"
            className="font-medium text-[#1a73e8] bg-blue-50 border border-blue-100 hover:bg-blue-100 min-w-[200px]"
        >
            <span className="mr-1">{formatDate(time)}</span>
            <span className="w-px h-3 bg-blue-200 mx-1"></span>
            <span className="tabular-nums">{formatTime(time)}</span>
        </Button>
    );
};
