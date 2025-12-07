// components/charts/ChartEloPro.jsx
"use client";

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bubble } from "react-chartjs-2";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const rankColors = {
  iron: "#6b7280",
  bronze: "#d97706",
  silver: "#94a3b8",
  gold: "#fbbf24",
  platinum: "#6ee7b7",
  diamond: "#60a5fa",
  master: "#c084fc",
};

const getRankColor = (label) => {
  const l = label.toLowerCase();
  if (l.includes("iron")) return rankColors.iron;
  if (l.includes("bronze")) return rankColors.bronze;
  if (l.includes("silver")) return rankColors.silver;
  if (l.includes("gold")) return rankColors.gold;
  if (l.includes("platinum")) return rankColors.platinum;
  if (l.includes("diamond")) return rankColors.diamond;
  return rankColors.master;
};

export default function ChartEloPro({ eloData = [] }) {
  const sortedData = [...eloData].sort((a, b) => {
    const eloA = parseInt(a.label) || 0;
    const eloB = parseInt(b.label) || 0;
    return eloA - eloB;
  });

  const labels = sortedData.map((d) => d.label);
  const counts = sortedData.map((d) => d.count || 0);

  // Ước lượng ELO trung bình cho mỗi bucket
  const getEloValue = (label) => {
    const num = parseInt(label);
    if (!isNaN(num)) return num;
    if (label.includes("Master")) return 2800;
    if (label.includes("Diamond")) return 2200;
    if (label.includes("Platinum")) return 1900;
    if (label.includes("Gold")) return 1600;
    if (label.includes("Silver")) return 1300;
    if (label.includes("Bronze")) return 1000;
    if (label.includes("Iron")) return 700;
    return 800;
  };

  const bubbleData = sortedData.map((item) => ({
    x: getEloValue(item.label),
    y: item.count,
    r: Math.max(15, Math.min(60, Math.sqrt(item.count) * 4)),
    count: item.count,
    label: item.label,
    color: getRankColor(item.label),
  }));

  const lineData = sortedData.map((item) => ({
    x: getEloValue(item.label),
    y: item.count,
  }));

  const data = {
    datasets: [
      // Line mượt + area fill gradient
      {
        type: "line",
        label: "Xu hướng phân bố người chơi",
        data: lineData,
        borderColor: "#20d1ff",
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: canvasCtx, data: chartData } = chart;
          if (!chartData.datasets?.[0]?.data?.length) return "transparent";
          const gradient = canvasCtx.createLinearGradient(
            0,
            0,
            0,
            chart.height
          );
          gradient.addColorStop(0, "rgba(32, 209, 255, 0.4)");
          gradient.addColorStop(0.5, "rgba(32, 209, 255, 0.15)");
          gradient.addColorStop(1, "rgba(32, 209, 255, 0)");
          return gradient;
        },
        borderWidth: 3.5,
        pointRadius: 0,
        tension: 0.5,
        fill: true,
        pointHoverRadius: 10,
        pointHoverBorderWidth: 4,
        pointHoverBackgroundColor: "#20d1ff",
      },
      // Bubble với màu rank + glow
      {
        type: "bubble",
        label: "Người chơi theo Rank",
        data: bubbleData,
        backgroundColor: bubbleData.map((d) => d.color + "cc"),
        borderColor: bubbleData.map((d) => d.color),
        borderWidth: 3,
        hoverBackgroundColor: "#ffffff",
        hoverBorderWidth: 5,
        hoverBorderColor: "#20d1ff",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#e0e0e0",
          font: { size: 14, weight: "600" },
          usePointStyle: true,
          pointStyle: "circle",
          padding: 25,
          generateLabels: (chart) => {
            return chart.data.datasets.map((dataset, i) => ({
              text: dataset.label,
              fillStyle: i === 0 ? "#20d1ff" : "#8b5cf6",
              strokeStyle: i === 0 ? "#20d1ff" : "#8b5cf6",
              fontColor: "#ffffff",
              color: "#ffffff",
              hidden: false,
              index: i,
            }));
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 15, 15, 0.95)",
        titleColor: "#20d1ff",
        bodyColor: "#fff",
        borderColor: "#20d1ff",
        borderWidth: 2,
        cornerRadius: 16,
        padding: 14,
        titleFont: { size: 16, weight: "bold" },
        bodyFont: { size: 15 },
        callbacks: {
          title: (ctx) => ctx[0].raw.label || "Không xác định",
          label: (ctx) => {
            if (ctx.dataset.type === "bubble") {
              return `Người chơi: ${ctx.raw.count.toLocaleString()}`;
            }
            return `Xu hướng: ${ctx.parsed.y.toLocaleString()} người chơi`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        min: 600,
        max: 3000,
        ticks: {
          color: "#94a3b8",
          font: { size: 12 },
          stepSize: 300,
          callback: (value) => value,
        },
        title: {
          display: true,
          text: "Điểm ELO",
          color: "#20d1ff",
          font: { size: 16, weight: "bold", family: "Inter" },
          padding: 10,
        },
        grid: { color: "rgba(255, 255, 255, 0.06)", lineWidth: 1 },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#94a3b8",
          font: { size: 12 },
          callback: (value) =>
            value >= 1000 ? `${value / 1000}k` : value,
        },
        title: {
          display: true,
          text: "Số lượng người chơi",
          color: "#20d1ff",
          font: { size: 16, weight: "bold", family: "Inter" },
          padding: 10,
        },
        grid: { color: "rgba(255, 255, 255, 0.06)" },
      },
    },
    animation: {
      duration: 2200,
      easing: "easeOutQuart",
    },
  };

  return (
    <div className="card chart-card elo-chart-pro">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Biểu đồ ELO nâng cao</h3>
          <p className="chart-subtitle">
            Phân tích mật độ & phân bố người chơi theo Rank (thời gian thực)
          </p>
        </div>
        <div className="live-badge">Live</div>
      </div>
      <div className="chart-inner">
        <Bubble data={data} options={options} />
      </div>
    </div>
  );
}
