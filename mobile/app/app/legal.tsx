import { router, useLocalSearchParams } from 'expo-router';
import { LegalModal, LegalTab } from '@/components/legal-modal';

export default function LegalScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialTab: LegalTab = params.type === 'privacy' ? 'privacy' : 'terms';

  return (
    <LegalModal
      visible={true}
      initialTab={initialTab}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
    />
  );
}
