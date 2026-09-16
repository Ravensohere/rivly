import React, { createContext, useContext, useEffect, useState } from 'react';
import { kernel, KernelConfig } from './kernel';

const KernelContext = createContext<{ isReady: boolean }>({ isReady: false });

export const KernelProvider: React.FC<{ config: KernelConfig; children: React.ReactNode }> = ({ config, children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const success = await kernel.initialize(config);
      setIsReady(success);
    };
    init();
  }, [config]);

  return (
    <KernelContext.Provider value={{ isReady }}>
      {children}
    </KernelContext.Provider>
  );
};

export const useKernel = () => useContext(KernelContext);
