import { useMemo } from 'react';
import { Medal, Trophy, User, Loader2 } from 'lucide-react';
import { useManagersLeaderboard, useExchangeRates, useUser } from '../api';
import { formatCurrency, getCommissionInCurrencies, cn } from '../lib/utils';
import { Contract } from '../types';

export interface LeaderboardWidgetProps {
  startDate: Date;
  endDate: Date;
  officeId?: string;
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
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Лидерборд</h3>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
          <p className="text-sm text-gray-500">Загрузка рейтинга...</p>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Лидерборд</h3>
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Нет данных о менеджерах</p>
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
        className={cn(
          'flex items-center justify-between p-3 rounded-lg transition-all',
          entry.isCurrentUser
            ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm'
            : 'bg-gray-50'
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Rank or Medal */}
          {showRank && (
            <div className="flex-shrink-0 w-8 flex items-center justify-center">
              {entry.rank <= 3 ? (
                <Medal className={cn('h-5 w-5', medalColors[entry.rank as 1 | 2 | 3])} />
              ) : (
                <span className="text-sm font-medium text-gray-500">
                  {entry.rank}
                </span>
              )}
            </div>
          )}

          {/* Manager Name */}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm truncate',
                entry.isCurrentUser
                  ? 'font-bold text-blue-900'
                  : 'font-medium text-gray-700'
              )}
            >
              {entry.managerName}
              {entry.isCurrentUser && (
                <span className="ml-1 text-xs text-blue-600">(Вы)</span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {entry.contractsCount}{' '}
              {entry.contractsCount === 1 ? 'сделка' : 'сделок'}
            </p>
          </div>

          {/* Commission */}
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(entry.totalCommission, 'USD')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Лидерборд
        </h3>
        <span className="text-xs text-gray-500">
          {leaderboard.length}{' '}
          {leaderboard.length === 1 ? 'менеджер' : 'менеджеров'}
        </span>
      </div>

      {/* Top 3 Performers */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
          Топ-3
        </div>
        {topPerformers.map((entry) => renderEntry(entry, true))}
      </div>

      {/* Adjacent Entries (if user is not in top 3) */}
      {adjacentEntries.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-gray-200">
          <div className="text-center">
            <span className="text-gray-400 text-xs">•••</span>
          </div>
          {adjacentEntries.map((entry) => renderEntry(entry, true))}
        </div>
      )}

      {/* User's rank summary if in top 3 */}
      {userEntry && userEntry.rank <= 3 && (
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-center text-gray-600">
            <span className="font-medium text-blue-600">
              Вы на {userEntry.rank} месте
            </span>{' '}
            из {leaderboard.length}
          </p>
        </div>
      )}

      {/* User's rank summary if not in top 3 */}
      {userEntry && userEntry.rank > 3 && (
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-center text-gray-600">
            Ваше место: {userEntry.rank} из {leaderboard.length}
          </p>
        </div>
      )}
    </div>
  );
}