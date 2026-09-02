import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/nativewindui/Text';

import EditScreenInfo from './EditScreenInfo';

type ScreenContentProps = {
  title: string;
  path: string;
  children?: React.ReactNode;
};

export const ScreenContent = ({ title, path, children }: ScreenContentProps) => {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="title1" className="text-center">
        {title}
      </Text>
      <View className="my-8 h-px w-4/5 bg-border" />
      <EditScreenInfo path={path} />
      {children}
    </View>
  );
};
