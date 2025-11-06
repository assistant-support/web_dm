// components/project/ProjectCharts.server.js
// Server Component - Render charts với SVG thuần

/**
 * ProjectCharts - Server Component render biểu đồ
 * @param {Object} props
 * @param {Object} props.taskStats - Task statistics by status
 * @param {Array} props.monthlyTrend - Monthly trend data
 */
export default function ProjectCharts({ taskStats, monthlyTrend }) {
    const stats = taskStats || {};
    const trend = monthlyTrend || [];

    // Dữ liệu cho Pie Chart (Task Status Distribution)
    const pieData = [
        { label: 'Hoàn thành', value: stats.completedTasks || 0, color: '#10b981' },
        { label: 'Đang làm', value: stats.inProgressTasks || 0, color: '#f59e0b' },
        { label: 'Chờ làm', value: stats.pendingTasks || 0, color: '#6b7280' },
    ].filter(item => item.value > 0);

    const total = pieData.reduce((sum, item) => sum + item.value, 0);

    // Tính góc cho pie chart
    let currentAngle = 0;
    const pieSlices = pieData.map(item => {
        const percentage = total > 0 ? (item.value / total) : 0;
        const angle = percentage * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        return {
            ...item,
            percentage: Math.round(percentage * 100),
            startAngle,
            endAngle: currentAngle,
        };
    });

    // Helper: Convert polar to cartesian
    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians),
        };
    };

    // Helper: Create arc path
    const describeArc = (x, y, radius, startAngle, endAngle) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
        return [
            'M', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            'L', x, y,
            'Z'
        ].join(' ');
    };

    // Dữ liệu cho Line Chart (Monthly Trend)
    const maxValue = Math.max(...trend.map(t => t.completed || 0), 1);
    const chartWidth = 400;
    const chartHeight = 200;
    const padding = 40;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const trendPoints = trend.map((point, index) => {
        const x = padding + (graphWidth / (trend.length - 1 || 1)) * index;
        const y = padding + graphHeight - (point.completed / maxValue) * graphHeight;
        return { x, y, value: point.completed, month: point.month };
    });

    const linePath = trendPoints.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart - Task Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Phân bổ công việc
                </h3>
                {total > 0 ? (
                    <div className="flex items-center gap-6">
                        <svg width="180" height="180" viewBox="0 0 180 180">
                            {pieSlices.map((slice, idx) => (
                                <path
                                    key={idx}
                                    d={describeArc(90, 90, 80, slice.startAngle, slice.endAngle)}
                                    fill={slice.color}
                                    className="hover:opacity-80 transition-opacity"
                                />
                            ))}
                            <circle cx="90" cy="90" r="45" fill="white" />
                            <text
                                x="90"
                                y="90"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-2xl font-bold fill-gray-900"
                            >
                                {total}
                            </text>
                        </svg>
                        <div className="flex-1 space-y-2">
                            {pieSlices.map((slice, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: slice.color }}
                                        />
                                        <span className="text-sm text-gray-700">{slice.label}</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {slice.value} ({slice.percentage}%)
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-8">Chưa có dữ liệu</p>
                )}
            </div>

            {/* Line Chart - Monthly Trend */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Xu hướng hoàn thành theo tháng
                </h3>
                {trend.length > 0 ? (
                    <svg width="100%" height="200" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                            const y = padding + graphHeight * (1 - ratio);
                            return (
                                <g key={i}>
                                    <line
                                        x1={padding}
                                        y1={y}
                                        x2={chartWidth - padding}
                                        y2={y}
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={padding - 10}
                                        y={y}
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                        className="text-xs fill-gray-500"
                                    >
                                        {Math.round(maxValue * ratio)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Line */}
                        <path
                            d={linePath}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />

                        {/* Points */}
                        {trendPoints.map((point, idx) => (
                            <g key={idx}>
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="4"
                                    fill="#3b82f6"
                                    className="hover:r-6 transition-all"
                                />
                                <text
                                    x={point.x}
                                    y={chartHeight - padding + 20}
                                    textAnchor="middle"
                                    className="text-xs fill-gray-600"
                                >
                                    {point.month}
                                </text>
                            </g>
                        ))}
                    </svg>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-8">Chưa có dữ liệu</p>
                )}
            </div>
        </div>
    );
}
