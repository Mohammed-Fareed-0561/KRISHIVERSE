import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`}></div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <div className="flex justify-between items-center mt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

export function NewsSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm mb-4 border border-gray-50">
      <Skeleton className="w-24 h-24 rounded-xl flex-shrink-0" />
      <div className="flex flex-col gap-2 flex-grow">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4 mt-auto" />
      </div>
    </div>
  );
}

export function WeatherSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-4 text-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </div>
  );
}
