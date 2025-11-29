import { useMemo, useState } from 'react';
import { Medal, Trophy, User, Loader2, Sun, Moon } from 'lucide-react';
import { useManagersLeaderboard, useExchangeRates, useUser } from '../api';
import { formatCurrency, getCommissionInCurrencies } from '../lib/utils';
import { Contract } from '../types';

export interface LeaderboardWidgetProps {
  startDate: Date;
  endDate: Date;
  officeId?: string;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
}

interface LeaderboardEntry {
  rank: number;
  managerId: string;
  managerName: string;
  totalCommission: number;
  contractsCount: number;
  isCurrentUser: boolean;
}

/**
 * LeaderboardWidget displays company-wide rankings
 */
export function LeaderboardWidget({
  startDate,
  endDate,
  officeId,
  isDarkMode = false,
  onThemeToggle,
}: LeaderboardWidgetProps) {
  const { data: user } = useUser();
  const { data: contracts, isLoading } = useManagersLeaderboard(
    startDate,
    endDate,
    officeId
  );
  const { data: rates } = useExchangeRates();

  // Calculate leaderboard with rankings
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    if (!contracts || !user || !rates) return [];

    // Group contracts by manager and calculate totals in USD
    const managerMap = new Map<string, Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>>();

    contracts.forEach((contract: Contract) => {
      // Strict rule: no netto = not counted
      if (contract.netto_price == null || contract.netto_price <= 0) {
        return;
      }

      const managerId = contract.created_by;
      const managerName = contract.expand?.created_by?.name || 'Неизвестно';

      // Calculate commission in USD using currency conversion
      const commissionInCurrencies = getCommissionInCurrencies(contract, rates);
      const commissionUSD = commissionInCurrencies.USD;

      if (managerMap.has(managerId)) {
        const entry = managerMap.get(managerId)!;
        entry.totalCommission += commissionUSD;
        entry.contractsCount += 1;
      } else {
        managerMap.set(managerId, {
          managerId,
          managerName,
          totalCommission: commissionUSD,
          contractsCount: 1,
        });
      }
    });

    // Sort by total commission descending and add rankings
    const sorted = Array.from(managerMap.values())
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        isCurrentUser: entry.managerId === user.id,
      }));

    return sorted;
  }, [contracts, user, rates]);

  // Get top 3 performers
  const topPerformers = leaderboard.slice(0, 3);

  // Find current user's entry
  const userEntry = leaderboard.find((entry) => entry.isCurrentUser);

  // Get adjacent entries if user is not in top 3
  const adjacentEntries = useMemo(() => {
    if (!userEntry || userEntry.rank <= 3) return [];

    const userIndex = leaderboard.findIndex(
      (entry) => entry.managerId === userEntry.managerId
    );

    // Get entries around user (rank-1, rank, rank+1)
    const start = Math.max(0, userIndex - 1);
    const end = Math.min(leaderboard.length, userIndex + 2);

    return leaderboard.slice(start, end);
  }, [leaderboard, userEntry]);

  if (isLoading) {
    return (
      <div className={`w-full p-4 rounded-lg border shadow-sm ${
        isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Лидерборд
          </h3>
          <button
            onClick={onThemeToggle}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className={`h-8 w-8 animate-spin mb-2 ${
            isDarkMode ? 'text-blue-400' : 'text-blue-500'
          }`} />
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            Загрузка рейтинга...
          </p>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className={`w-full p-4 rounded-lg border shadow-sm ${
        isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Лидерборд
          </h3>
          <button
            onClick={onThemeToggle}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <div className="text-center py-8">
          <User className={`h-12 w-12 mx-auto mb-2 ${
            isDarkMode ? 'text-gray-600' : 'text-gray-300'
          }`} />
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            Нет данных о менеджерах
          </p>
        </div>
      </div>
    );
  }

  /**
   * Render a single leaderboard entry
   */
  const renderEntry = (entry: LeaderboardEntry, showRank = true) => {
    const medalColors = {
      1: 'text-yellow-500', // Gold
      2: 'text-gray-400', // Silver
      3: 'text-amber-600', // Bronze
    };

    return (
      <div
        key={entry.managerId}
        className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-all text-sm ${
          entry.isCurrentUser
            ? isDarkMode
              ? 'bg-blue-900/50 border-l-4 border-blue-400 shadow-sm'
              : 'bg-blue-50 border-l-4 border-blue-500 shadow-sm'
            : isDarkMode
              ? 'bg-gray-700/30 hover:bg-gray-700/50'
              : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        {/* Rank or Medal - 1 column */}
        {showRank && (
          <div className="col-span-1 flex justify-center">
            {entry.rank <= 3 ? (
              <Medal className={`h-4 w-4 ${medalColors[entry.rank as 1 | 2 | 3]}`} />
            ) : (
              <span className={`text-xs font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {entry.rank}
              </span>
            )}
          </div>
        )}

        {/* Manager Name - 6 columns */}
        <div className="col-span-6 min-w-0">
          <p className={`truncate ${
            entry.isCurrentUser
              ? isDarkMode
                ? 'font-bold text-blue-300'
                : 'font-bold text-blue-900'
              : isDarkMode
                ? 'font-medium text-gray-200'
                : 'font-medium text-gray-700'
          }`}>
            {entry.managerName}
            {entry.isCurrentUser && (
              <span className={`ml-1 text-xs ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                (Вы)
              </span>
            )}
          </p>
        </div>

        {/* Contracts - 2 columns */}
        <div className="col-span-2 text-center">
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {entry.contractsCount}
          </span>
        </div>

        {/* Commission - 3 columns */}
        <div className="col-span-3 text-right">
          <p className={`text-xs font-semibold ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            {formatCurrency(entry.totalCommission, 'USD')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full p-4 rounded-lg border shadow-sm ${
      isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/80 border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold flex items-center gap-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Trophy className={`h-5 w-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
          Лидерборд
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {leaderboard.length}{' '}
            {leaderboard.length === 1 ? 'менеджер' : 'менеджеров'}
          </span>
          <button
            onClick={onThemeToggle}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className={`grid grid-cols-12 gap-2 items-center p-2 mb-3 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="col-span-1 text-center">
          <span className={`text-xs font-medium uppercase tracking-wide ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            #
          </span>
        </div>
        <div className="col-span-6">
          <span className={`text-xs font-medium uppercase tracking-wide ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Менеджер
          </span>
        </div>
        <div className="col-span-2 text-center">
          <span className={`text-xs font-medium uppercase tracking-wide ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Сделки
          </span>
        </div>
        <div className="col-span-3 text-right">
          <span className={`text-xs font-medium uppercase tracking-wide ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Комиссия
          </span>
        </div>
      </div>

      {/* Top 3 Performers */}
      <div className="space-y-1 mb-4">
        {topPerformers.map((entry) => renderEntry(entry, true))}
      </div>

      {/* Adjacent Entries (if user is not in top 3) */}
      {adjacentEntries.length > 0 && (
        <div className={`space-y-1 pt-3 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="text-center">
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              •••
            </span>
          </div>
          {adjacentEntries.map((entry) => renderEntry(entry, true))}
        </div>
      )}

      {/* User's rank summary if in top 3 */}
      {userEntry && userEntry.rank <= 3 && (
        <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className={`font-medium ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              Вы на {userEntry.rank} месте
            </span>{' '}
            из {leaderboard.length}
          </p>
        </div>
      )}

      {/* User's rank summary if not in top 3 */}
      {userEntry && userEntry.rank > 3 && (
        <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Ваше место: {userEntry.rank} из {leaderboard.length}
          </p>
        </div>
      )}
    </div>
  );
}