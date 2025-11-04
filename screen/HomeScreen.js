import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  onSnapshot,
  collection,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

const CATEGORY_LIST = [
  { key: "shirt", label: "Shirt" },
  { key: "glasses", label: "Glasses" },
  { key: "pants", label: "Pants" },
];

const emptyItems = CATEGORY_LIST.reduce(
  (acc, item) => ({ ...acc, [item.key]: [] }),
  {}
);

export default function HomeScreen({ navigation }) {
  const [itemsByCategory, setItemsByCategory] = useState(emptyItems);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const adminItemsRef = useRef({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || role === null) {
      return undefined;
    }

    adminItemsRef.current = {};
    setItemsByCategory(
      CATEGORY_LIST.reduce((acc, item) => ({ ...acc, [item.key]: [] }), {})
    );
    setLoading(true);

    let isMounted = true;
    let unsubscribeFunctions = [];

    const rebuildFromCache = () => {
      const combined = CATEGORY_LIST.reduce((acc, category) => {
        const aggregated = [];
        Object.values(adminItemsRef.current).forEach((categoryMap) => {
          if (categoryMap?.[category.key]) {
            aggregated.push(...categoryMap[category.key]);
          }
        });
        acc[category.key] = aggregated;
        return acc;
      }, {});
      setItemsByCategory(combined);
      setLoading(false);
    };

    const attachListenersForOwner = (ownerId) => {
      CATEGORY_LIST.forEach(({ key }) => {
       const productsRef = collection(
         db,
         "users",
         ownerId,
          key
        );
        const unsubscribe = onSnapshot(
          productsRef,
          (snapshot) => {
            adminItemsRef.current = {
              ...adminItemsRef.current,
              [ownerId]: {
                ...(adminItemsRef.current[ownerId] || {}),
                [key]: snapshot.docs.map((docSnap) => ({
                  id: `${ownerId}_${docSnap.id}`,
                  ownerId,
                  ...docSnap.data(),
                })),
              },
            };
            rebuildFromCache();
          },
          (error) => {
            console.log("Home items error:", error);
            setLoading(false);
          }
        );
        unsubscribeFunctions.push(unsubscribe);
      });
    };

    const setupListeners = async () => {
      try {
        if (role === "admin") {
          attachListenersForOwner(user.uid);
        } else {
          const adminQuery = query(
            collection(db, "users"),
            where("role", "==", "admin")
          );
          const adminSnapshot = await getDocs(adminQuery);
          if (!isMounted) {
            return;
          }
          const adminIds = adminSnapshot.docs.map((docSnap) => docSnap.id);
          if (adminIds.length === 0) {
            setItemsByCategory(
              CATEGORY_LIST.reduce(
                (acc, item) => ({ ...acc, [item.key]: [] }),
                {}
              )
            );
            setLoading(false);
            return;
          }
          adminIds.forEach((adminId) => attachListenersForOwner(adminId));
        }
      } catch (error) {
        console.log("Home admin fetch error:", error);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      unsubscribeFunctions.forEach((fn) => fn && fn());
    };
  }, [role]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigation.replace("Login");
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snap) => {
      const data = snap.data();
      setRole(data?.role ?? "customer");
    });

    return () => unsubscribeUser();
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#0C7FDA" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {CATEGORY_LIST.map((category) => {
              const entries = itemsByCategory[category.key] ?? [];
              return (
                <View key={category.key} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category.label}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.horizontalList}>
                    {entries.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No items yet</Text>
                      </View>
                    ) : (
                      entries.map((item) => (
                        <View key={item.id} style={styles.itemCardWrapper}>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => {
                              const parentNav = navigation.getParent();
                              if (parentNav) {
                                parentNav.navigate("ProductDetail", { item });
                              } else {
                                navigation.navigate("ProductDetail", { item });
                              }
                            }}
                          >
                            <View style={styles.itemCard}>
                              {item.picture ? (
                                <Image
                                  source={{ uri: item.picture }}
                                  style={styles.itemImage}
                                />
                              ) : (
                                <View style={styles.placeholderImage}>
                                  <Ionicons
                                    name="image-outline"
                                    size={28}
                                    color="#0C7FDA"
                                  />
                                </View>
                              )}
                              <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>
                                  {item.name || "No name"}
                                </Text>
                                <Text style={styles.itemPrice}>
                                  ฿{item.price ?? "-"}
                                </Text>
                                {!!item.detail && (
                                  <Text style={styles.itemDetail} numberOfLines={2}>
                                    {item.detail}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                    </View>
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        )}

        {role === "admin" && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.navigate("Add");
              } else {
                navigation.navigate("Add");
              }
            }}
          >
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0C7FDA",
    marginBottom: 12,
  },
  horizontalList: {
    flexDirection: "row",
    paddingRight: 16,
  },
  itemCard: {
    width: 140,
    borderWidth: 2,
    borderColor: "#0C7FDA",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  itemCardWrapper: {
    marginRight: 12,
  },
  itemImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F8FC",
  },
  itemInfo: {
    padding: 10,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0C7FDA",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    color: "#444",
  },
  emptyCard: {
    width: 140,
    height: 160,
    borderWidth: 2,
    borderColor: "#d0d7dd",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f7fa",
    marginRight: 12,
  },
  emptyText: {
    color: "#999",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#0C7FDA",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
