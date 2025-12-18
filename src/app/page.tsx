
'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Step1Upload } from '@/components/steps/step1-upload';
import { Step2Mapping } from '@/components/steps/step2-mapping';
import { Step3Run } from '@/components/steps/step3-run';
import { DataProvider, useDataContext } from '@/context/data-context';

function HomePage() {
  const { step, setStep } = useDataContext();

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Upload />;
      case 2:
        return <Step2Mapping />;
      case 3:
        return <Step3Run />;
      default:
        return <Step1Upload />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">{renderStep()}</div>
      </main>
    </div>
  );
}


export default function Home() {
  return (
    <DataProvider>
      <HomePage />
    </DataProvider>
  )
}
