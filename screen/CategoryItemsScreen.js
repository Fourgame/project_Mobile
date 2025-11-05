import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const GRID_GAP = 16;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_GAP * 3) / 2;

export default function CategoryItemsScreen({ navigation, route }) {
  const categoryLabel = route.params?.categoryLabel || "Items";
  const items = Array.isArray(route.params?.items)
    ? route.params.items
    : [];

  const handleOpenDetail = (item) => {
    const parentNav = navigation.getParent?.();
    if (parentNav) {
      parentNav.navigate("ProductDetail", { item });
    } else {
      navigation.navigate("ProductDetail", { item });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => handleOpenDetail(item)}
    >
      {item.picture ? (
        <Image source={{ uri: item.picture }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={28} color="#0C7FDA" />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name || "Unnamed item"}
        </Text>
        <Text style={styles.price}>
          ฿{" "}
          {Number(item.price || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        {!!item.detail && (
          <Text style={styles.detail} numberOfLines={2}>
            {item.detail}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#0C7FDA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryLabel}</Text>
        <View style={{ width: 32 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="cube-outline"
            size={40}
            color="rgba(12, 127, 218, 0.6)"
          />
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item.id || item.docId || `${categoryLabel}_${index}`
          }
          numColumns={2}
          contentContainerStyle={styles.listContent}
  columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dde4",
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8dde4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0C7FDA",
  },
  listContent: {
    padding: GRID_GAP,
    paddingBottom: GRID_GAP * 2,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    columnGap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d8dde4",
    overflow: "hidden",
    marginBottom: GRID_GAP,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  image: {
    width: "100%",
    height: 140,
    resizeMode: "cover",
  },
  placeholder: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F8FC",
  },
  info: {
    padding: 12,
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2A37",
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0C7FDA",
  },
  detail: {
    fontSize: 13,
    color: "#6B7280",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
  },
});
