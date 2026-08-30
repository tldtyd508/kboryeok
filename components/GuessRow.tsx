import React from 'react';
import { Player } from '@/lib/types';
import { useGameStore } from '@/lib/store';
import { compareGuess, calcAge } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { ArrowUp, ArrowDown, Check, X } from 'lucide-react';

interface GuessRowProps {
  guess: Player;
}

const ResultBadge: React.FC<{ status: string; children: React.ReactNode }> = ({ status, children }) => {
  const iconProps = { className: "w-3 h-3 mr-1" };
  if (status === 'correct') return <Badge variant="correct"><Check {...iconProps} />{children}</Badge>;
  if (status === 'partial') return <Badge variant="partial"><X {...iconProps} />{children}</Badge>;
  return <Badge variant="incorrect"><X {...iconProps} />{children}</Badge>;
};

const DirectionBadge: React.FC<{ direction: string; children: React.ReactNode }> = ({ direction, children }) => {
  const iconProps = { className: "w-3 h-3 mr-1" };
  if (direction === 'up') return <Badge variant="up"><ArrowUp {...iconProps} />{children}</Badge>;
  if (direction === 'down') return <Badge variant="down"><ArrowDown {...iconProps} />{children}</Badge>;
  return <Badge variant="correct"><Check {...iconProps} />{children}</Badge>;
};

const GuessRow = ({ guess }: GuessRowProps) => {
  const secretPlayer = useGameStore((state) => state.secretPlayer);
  if (!secretPlayer) return null;

  const result = compareGuess(secretPlayer, guess);

  return (
    <TableRow className="bg-card">
      <TableCell className="font-medium">{guess.name}</TableCell>
      <TableCell><ResultBadge status={result.team}>{guess.team}</ResultBadge></TableCell>
      <TableCell><ResultBadge status={result.position}>{guess.positionDetail}</ResultBadge></TableCell>
      <TableCell><ResultBadge status={result.throws}>{guess.throws}</ResultBadge></TableCell>
      <TableCell><ResultBadge status={result.bats}>{guess.bats}</ResultBadge></TableCell>
      
      <TableCell><DirectionBadge direction={result.age}>만 {calcAge(guess.birthDate)}세</DirectionBadge></TableCell>
      <TableCell><DirectionBadge direction={result.jerseyNumber}>{guess.jerseyNumber}</DirectionBadge></TableCell>
    </TableRow>
  );
};

export default GuessRow;
