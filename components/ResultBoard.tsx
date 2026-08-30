
import React from 'react';
import { useGameStore } from '@/lib/store';
import GuessRow from '@/components/GuessRow';
import { Table, TableBody, TableHeader, TableHead, TableRow } from '@/components/ui/table';

const ResultBoard = () => {
  const guesses = useGameStore((state) => state.guesses);

  return (
    <div className="border rounded-md mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>선수</TableHead>
            <TableHead>팀</TableHead>
            <TableHead>포지션</TableHead>
            <TableHead>투</TableHead>
            <TableHead>타</TableHead>
            
            <TableHead>나이</TableHead>
            <TableHead>등번호</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guesses.map((guess) => (
            <GuessRow key={guess.id} guess={guess} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ResultBoard;
