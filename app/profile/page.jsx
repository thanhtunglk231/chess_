"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [winRate, setWinRate] = useState(null);
  const [matches, setMatches] = useState([]);
  const [eloHistory, setEloHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        // Fetch stats
        const statsRes = await fetch(`/api/stats?userId=${user.id}`);
        const statsData = await statsRes.json();

        if (statsData.error) {
          console.error("Stats error:", statsData.error);
        } else {
          setStats(statsData.stats);
          setWinRate(statsData.winRate);
        }

        // Fetch match history
        const matchesRes = await fetch(
          `/api/match-history?userId=${user.id}&limit=10`
        );
        const matchesData = await matchesRes.json();

        if (!matchesData.error) {
          setMatches(matchesData.matches);
        }

        // Fetch ELO history
        const eloRes = await fetch(
          `/api/elo-history?userId=${user.id}&limit=20`
        );
        const eloData = await eloRes.json();

        if (!eloData.error) {
          setEloHistory(eloData.history);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Vui lòng đăng nhập</p>
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-block"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Đang tải...</p>
      </div>
    );
  }

  const winRatePercent =
    stats?.totalGames > 0
      ? Math.round((stats.wins / stats.totalGames) * 100)
      : 0;

  return (
    <div className="min-h-screen p-4 bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">
          📊 Hồ sơ của {user.username}
        </h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-yellow-400 text-sm mb-2">ELO RATING</h3>
            <p className="text-4xl font-bold text-white">{user.elo || 1200}</p>
            {stats && (
              <p className="text-sm text-gray-400 mt-2">
                Cao nhất: {stats.highestElo || user.elo} | Thấp nhất:{" "}
                {stats.lowestElo || user.elo}
              </p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-yellow-400 text-sm mb-2">TỔNG TRẬN</h3>
            <p className="text-4xl font-bold text-white">
              {stats?.totalGames || 0}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {stats?.wins || 0}W / {stats?.losses || 0}L / {stats?.draws || 0}D
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-yellow-400 text-sm mb-2">TỈ LỆ THẮNG</h3>
            <p className="text-4xl font-bold text-white">{winRatePercent}%</p>
            <p className="text-sm text-gray-400 mt-2">
              Streak: {stats?.currentWinStreak || 0} trận
            </p>
          </div>
        </div>

        {/* Win Rate by Color */}
        {winRate && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">
              📈 Thống kê theo màu
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">
                  ♔ Quân Trắng
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-400">
                    Trận:{" "}
                    <span className="text-white">
                      {winRate.white?.games || 0}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Thắng:{" "}
                    <span className="text-green-400">
                      {winRate.white?.wins || 0}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Thua:{" "}
                    <span className="text-red-400">
                      {winRate.white?.losses || 0}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Hòa:{" "}
                    <span className="text-yellow-400">
                      {winRate.white?.draws || 0}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Win rate:{" "}
                    <span className="text-white font-bold">
                      {winRate.white?.winRate || 0}%
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">
                  ♚ Quân Đen
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-400">
                    Trận:{" "}
                    <span className="text-white">
                      {winRate.black?.games || 0}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Thắng:{" "}
                    <span className="text-green-400">
                      {winRate.black?.wins || 0}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Thua:{" "}
                    <span className="text-red-400">
                      {winRate.black?.losses || 0}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Hòa:{" "}
                    <span className="text-yellow-400">
                      {winRate.black?.draws || 0}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Win rate:{" "}
                    <span className="text-white font-bold">
                      {winRate.black?.winRate || 0}%
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match History */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            🎮 Lịch sử đấu gần đây
          </h2>
          <div className="space-y-3">
            {matches.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Chưa có trận đấu nào
              </p>
            ) : (
              matches.map((match) => (
                <div
                  key={match._id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`text-2xl ${
                          match.result === "win"
                            ? "text-green-400"
                            : match.result === "loss"
                            ? "text-red-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {match.result === "win"
                          ? "✓"
                          : match.result === "loss"
                          ? "✗"
                          : "="}
                      </div>

                      <div>
                        <p className="text-white font-semibold">
                          vs {match.opponentUsername}
                          <span className="text-gray-400 text-sm ml-2">
                            ({match.opponentElo})
                          </span>
                        </p>
                        <p className="text-sm text-gray-400">
                          {match.myColor === "white" ? "♔ Trắng" : "♚ Đen"} •{" "}
                          {match.endReason}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          match.eloChange > 0
                            ? "text-green-400"
                            : match.eloChange < 0
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        {match.eloChange > 0 ? "+" : ""}
                        {match.eloChange}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(match.playedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {matches.length > 0 && (
            <div className="mt-4 text-center">
              <Link
                href="/match-history"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Xem tất cả →
              </Link>
            </div>
          )}
        </div>

        {/* ELO History */}
        {eloHistory.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              📉 Lịch sử ELO gần đây
            </h2>
            <div className="space-y-2">
              {eloHistory.slice(0, 10).map((entry, idx) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-400">
                    {new Date(entry.createdAt).toLocaleString("vi-VN")}
                  </span>
                  <span className="text-white">{entry.eloAfter}</span>
                  <span
                    className={`font-semibold ${
                      entry.eloChange > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {entry.eloChange > 0 ? "+" : ""}
                    {entry.eloChange}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/room"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg inline-block"
          >
            ← Quay lại phòng chơi
          </Link>
        </div>
      </div>
    </div>
  );
}
