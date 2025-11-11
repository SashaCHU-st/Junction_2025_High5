import { Text, View } from "react-native";
import { useSafeAreaInsets} from 'react-native-safe-area-context';

export default function Index() {
  const insets = useSafeAreaInsets();
  return (
     <View style={{ flex: 1, paddingTop: insets.top }}>
      <Text style={{ fontSize: 15 }}>Content is in safe area.</Text>
    </View>
  );

}
