import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CosmeticBrowser } from '@/game/menu/CosmeticBrowser';

/** Loja de cosméticos da costureira (Dona Iracema). Compra com moedas, com prova antes de comprar. */
export function CosmeticShopOverlay({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.root}>
      <CosmeticBrowser mode="shop" onClose={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(14,10,30,0.97)', alignItems: 'center', justifyContent: 'center' },
});
