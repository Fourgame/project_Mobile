// screens/FriendScreen.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebase/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { styles } from "../styles/FriendScreenStyle";

const AVATAR_FALLBACK = "https://i.ibb.co/9bQf3rW/placeholder-profile.png";

const pickStudentId = (obj = {}) =>
  String(
    obj.studentId ?? obj.studentID ?? obj.studentNo ?? obj.sid ?? ""
  ).trim();

export default function FriendScreen() {
  const me = auth.currentUser;

  const [emailInput, setEmailInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const myFriendsColRef = useMemo(() => {
    if (!me) return null;
    return collection(doc(db, "users", me.uid), "friends");
  }, [me?.uid]);

  useEffect(() => {
    if (!me || !myFriendsColRef) return;
    const q = query(myFriendsColRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setFriends(arr);
        setLoadingList(false);
      },
      () => setLoadingList(false)
    );
    return unsub;
  }, [me?.uid, myFriendsColRef]);

  if (!me) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.infoText}>Please login first.</Text>
      </SafeAreaView>
    );
  }

  const canonicalPairId = (a, b) => [a, b].sort().join("_");


  const addFriendByEmail = async () => {
    try {
      const input = emailInput.trim().toLowerCase();
      if (!input) return;
      if (input === (me.email || "").toLowerCase()) {
        Alert.alert("Invalid", "You cannot add yourself.");
        return;
      }

      setAdding(true);

    
      const userQ = query(
        collection(db, "users"),
        where("email", "==", input),
        limit(1)
      );
      const userSnap = await getDocs(userQ);
      if (userSnap.empty) {
        setAdding(false);
        Alert.alert("Not found", "No user with this email.");
        return;
      }
      const friendDoc = userSnap.docs[0];
      const friendUid = friendDoc.id;
      const friendData = friendDoc.data(); 
     
      const myUserDoc = await getDoc(doc(db, "users", me.uid));
      const myProfile = myUserDoc.exists() ? myUserDoc.data() : {};

      
      const pairId = canonicalPairId(me.uid, friendUid);
      const friendshipRef = doc(db, "friendships", pairId);
      const myFriendRef = doc(db, "users", me.uid, "friends", friendUid);
      const theirFriendRef = doc(db, "users", friendUid, "friends", me.uid);

      await runTransaction(db, async (tx) => {
       
        const [frSnap, mySnap, theirSnap] = await Promise.all([
          tx.get(friendshipRef),
          tx.get(myFriendRef),
          tx.get(theirFriendRef),
        ]);

       
        if (!frSnap.exists()) {
          tx.set(friendshipRef, {
            uids: [me.uid, friendUid].sort(),
            createdAt: serverTimestamp(),
            createdBy: me.uid,
          });
        }

        if (!mySnap.exists()) {
          const friendName = `${friendData.firstName ?? ""} ${
            friendData.lastName ?? ""
          }`.trim();
          tx.set(myFriendRef, {
            friendUid,
            friendEmail: (friendData.email || "").toLowerCase(),
            friendName: friendName || friendData.email || friendUid,
            friendPhotoUrl: friendData.photoUrl || "",
            friendStudentId: pickStudentId(friendData), 
            createdAt: serverTimestamp(),
          });
        }

        if (!theirSnap.exists()) {
          const myName = `${myProfile.firstName ?? ""} ${
            myProfile.lastName ?? ""
          }`.trim();
          tx.set(theirFriendRef, {
            friendUid: me.uid,
            friendEmail: (me.email || "").toLowerCase(),
            friendName: myName || me.email || me.uid,
            friendPhotoUrl: myProfile.photoUrl || "",
            friendStudentId: pickStudentId(myProfile), 
            createdAt: serverTimestamp(),
          });
        }
      });

      setEmailInput("");
      Alert.alert(
        "Success",
        `You are now friends with ${friendData.email || "this user"}.`
      );
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to add friend.");
    } finally {
      setAdding(false);
    }
  };

  
  useEffect(() => {
    const run = async () => {
      if (!me || !friends?.length) return;

      const need = friends.filter((f) => !f.friendStudentId);
      if (!need.length) return;

      // แบ่งเป็นก้อนละ 10 (ข้อจำกัด where in)
      const chunk = (arr, size) =>
        arr.reduce((acc, _, i) => {
          if (i % size === 0) acc.push(arr.slice(i, i + size));
          return acc;
        }, []);

      const uidChunks = chunk(
        need.map((n) => n.friendUid).filter(Boolean),
        10
      );

      for (const uids of uidChunks) {
        const q = query(collection(db, "users"), where("__name__", "in", uids));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          const normalizedId = pickStudentId(d.data());
          if (!normalizedId) continue;

          const myFriendRef = doc(db, "users", me.uid, "friends", d.id);
          
          await runTransaction(db, async (tx) => {
            const cur = await tx.get(myFriendRef);
            if (cur.exists() && !cur.data().friendStudentId) {
              tx.set(
                myFriendRef,
                { friendStudentId: normalizedId },
                { merge: true }
              );
            }
          });
        }
      }
    };
    run().catch(console.log);
  }, [me?.uid, friends]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>👥 Friend Page</Text>
      </View>

      {/* Add friend row */}
      <View style={styles.addRow}>
        <TextInput
          value={emailInput}
          onChangeText={setEmailInput}
          placeholder="friend@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.emailInput}
        />
        <TouchableOpacity
          onPress={addFriendByEmail}
          disabled={adding || !emailInput.trim()}
          style={[styles.addButton, adding && styles.addButtonDisabled]}
        >
        {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.addButtonText}>＋</Text>}
        </TouchableOpacity>
      </View>

      {/* Friend list */}
      {loadingList ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          style={styles.list}
          data={friends}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No friends yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <Image
                source={{ uri: item.friendPhotoUrl || AVATAR_FALLBACK }}
                style={styles.avatar}
              />
              <View style={styles.itemMain}>
                <Text style={styles.itemName}>{item.friendName || "Unnamed"}</Text>
                <Text style={styles.itemMeta}>{item.friendEmail || item.friendUid}</Text>

                <Text style={styles.itemMeta}>
                  Student ID: {item.friendStudentId || "-"}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
