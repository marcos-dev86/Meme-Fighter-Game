import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MenuButton } from '@/game/menu/MenuButton';
import { useI18n } from '@/game/i18n/i18n';
import { NICK_MAX } from './accountConfig';
import { cleanNick } from './accountCore';
import { setNickname } from './accountState';

/**
 * Pede o apelido do jogador. `first` = primeiro acesso (não dá para cancelar). Fora do primeiro acesso é a edição do perfil.
 */
export function NicknameDialog({ initial, first, onDone, onCancel }: { initial?: string | null; first?: boolean; onDone: () => void; onCancel?: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial ?? '');
  const ok = cleanNick(value).length > 0;
  const submit = () => {
    if (ok && setNickname(value)) onDone();
  };
  return (
    <View style={styles.backdrop} testID="nickname-dialog">
      <View style={styles.card}>
        <Text style={styles.title}>{first ? t('nick_first_title') : t('nick_edit_title')}</Text>
        <Text style={styles.hint}>{first ? t('nick_first_hint') : t('nick_edit_hint')}</Text>
        <TextInput
          testID="nickname-input"
          style={styles.input}
          value={value}
          onChangeText={setValue}
          maxLength={NICK_MAX}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('nick_placeholder')}
          placeholderTextColor="#8a7a55"
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <Text style={styles.count}>{cleanNick(value).length}/{NICK_MAX}</Text>
        <MenuButton label={t('nick_confirm')} onPress={submit} disabled={!ok} />
        {!first && onCancel && (
          <>
            <View style={{ height: 10 }} />
            <MenuButton label={t('exit_cancel')} variant="ghost" onPress={onCancel} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', zIndex: 300 },
  card: { backgroundColor: '#2A1E0C', borderColor: '#FFCD3C', borderWidth: 3, borderRadius: 14, padding: 22, alignItems: 'center', maxWidth: 380, width: '88%' },
  title: { color: '#FFD700', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  hint: { color: '#e8d9b0', fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  input: { backgroundColor: '#fff7dc', color: '#3a2a12', borderRadius: 8, borderWidth: 2, borderColor: '#B9820A', fontSize: 20, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 10, width: '100%', textAlign: 'center' },
  count: { color: '#b9a370', fontSize: 11, marginTop: 4, marginBottom: 12 },
});
