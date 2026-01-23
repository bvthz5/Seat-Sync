import React from 'react';
import { DashboardCards } from '../components/DashboardCards';
import { LiveMonitor } from '../components/LiveMonitor';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { QuickActions } from '../components/QuickActions';
import { ActivityFeed } from '../components/ActivityFeed';
import { LiveExamDetails } from '../components/LiveExamDetails';
import { LiveClock } from '../components/LiveClock';
import { Button } from '@heroui/react';
import { Download, RefreshCw } from 'lucide-react';

const Dashboard: React.FC = () => {
    return (
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6 p-6 pb-20">
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-normal text-[#202124] tracking-tight">Dashboard</h1>
                    <p className="text-[#5f6368] text-sm mt-1">Real-time examination monitoring system.</p>
                </div>
                <div className="flex gap-3 items-center">
                    <Button
                        startContent={<RefreshCw size={16} />}
                        variant="light"
                        radius="full"
                        className="font-medium text-[#5f6368] hover:bg-[#f1f3f4]"
                    >
                        Refresh Data
                    </Button>

                    {/* Live Clock Component */}
                    <LiveClock />


                </div>
            </div>

            {/* 2. KPI Cards Strip */}
            <DashboardCards />

            {/* 3. Main Bento Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                {/* LEFT COLUMN: Main Monitoring (Span 8) */}
                <div className="xl:col-span-8 flex flex-col gap-6 w-full">
                    {/* Visual Analytics Row */}
                    <div className="h-[350px] w-full">
                        <AnalyticsChart />
                    </div>

                    {/* Live Monitor Table */}
                    <div className="min-h-[450px] w-full">
                        <LiveMonitor />
                    </div>
                </div>

                {/* RIGHT COLUMN: Action & Feed (Span 4) */}
                <div className="xl:col-span-4 flex flex-col gap-6 w-full h-full">
                    {/* Quick Action Tiles */}
                    <div className="w-full">
                        <QuickActions />
                    </div>

                    {/* Activity Feed */}
                    <div className="flex-1 w-full min-h-[400px]">
                        <ActivityFeed />
                    </div>
                </div>

                {/* BOTTOM ROW: Live Details (Span 12) */}
                <div className="xl:col-span-12 w-full">
                    <LiveExamDetails />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
