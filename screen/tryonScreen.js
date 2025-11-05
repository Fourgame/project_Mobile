// App.js
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Buffer } from "buffer";

global.Buffer = global.Buffer || Buffer;

// URL Cloud Run ของคุณ (us-central1)
const CLOUD_FN_URL =
  "https://tryon-us-715686729537.us-central1.run.app";

export default function App() {
  const [personImage, setPersonImage] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // เลือกรูปคน
  const pickPersonImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled) {
      setPersonImage(res.assets[0].uri);
      setResultImage(null);
    }
  };

  // เพิ่มรูปเสื้อผ้า
  const addProductImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled) {
      setProductImages((prev) => [...prev, res.assets[0].uri]);
    }
  };

  // ลบรูปเสื้อผ้า
  const removeProductImage = (idx) => {
    setProductImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ฟังก์ชันยิง Cloud Run ทีละครั้ง (คน base64 + เสื้อ base64)
  const callTryOnOnce = async (personBase64, productBase64) => {
    const resp = await fetch(CLOUD_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personBase64,
        productBase64List: [productBase64], // ส่งทีละ 1 ชิ้น
      }),
    });
    const data = await resp.json();
    if (!resp.ok || data.error) {
      throw new Error(JSON.stringify(data));
    }
    const imgBase64 =
      data.predictions &&
      data.predictions[0] &&
      data.predictions[0].bytesBase64Encoded;
    if (!imgBase64) {
      throw new Error("No image returned");
    }
    return imgBase64; // คืน base64 ให้รอบถัดไปใช้เป็นคน
  };

  // กดเริ่มลองใส่ (หลายชิ้น)
  const tryOnAll = async () => {
    if (!personImage) {
      Alert.alert("แจ้งเตือน", "กรุณาเลือกรูปคนก่อน");
      return;
    }
    if (productImages.length === 0) {
      Alert.alert("แจ้งเตือน", "กรุณาเลือกเสื้อผ้าอย่างน้อย 1 รูป");
      return;
    }

    setLoading(true);
    setResultImage(null);

    try {
      // 1) แปลง "คน" รอบแรก
      const personResp = await fetch(personImage);
      let currentPersonBase64 = Buffer.from(
        await personResp.arrayBuffer()
      ).toString("base64");

      // 2) วนทีละเสื้อผ้า
      for (let i = 0; i < productImages.length; i++) {
        const uri = productImages[i];

        // แปลงเสื้อผ้าชิ้นนี้
        const prodResp = await fetch(uri);
        const productBase64 = Buffer.from(
          await prodResp.arrayBuffer()
        ).toString("base64");

        // ยิงไป Cloud Run เพื่อให้ใส่ชิ้นนี้
        const outBase64 = await callTryOnOnce(
          currentPersonBase64,
          productBase64
        );

        // เซ็ตคนปัจจุบัน = รูปผลลัพธ์ที่เพิ่งได้ (เพื่อไปใส่ชิ้นถัดไป)
        currentPersonBase64 = outBase64;

        // ถ้าอยากแสดง progress ก็ทำตรงนี้ได้
        // console.log(`finished item ${i + 1}/${productImages.length}`);
      }

      // 3) พอจบทุกชิ้น เอาภาพสุดท้ายมาแสดง
      setResultImage(`data:image/png;base64,${currentPersonBase64}`);
    } catch (err) {
      console.error(err);
      Alert.alert("เกิดข้อผิดพลาด", err.message);
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👕 Virtual Try-On (หลายชิ้น)</Text>

      <Text style={styles.label}>เลือกรูปคน</Text>
      <TouchableOpacity style={styles.button} onPress={pickPersonImage}>
        <Text style={styles.buttonText}>
          {personImage ? "เปลี่ยนรูปคน" : "เลือกคน"}
        </Text>
      </TouchableOpacity>
      {personImage && (
        <Image source={{ uri: personImage }} style={styles.mainImage} />
      )}

      <Text style={styles.label}>เสื้อผ้าที่จะลองใส่ (ใส่ได้หลายชิ้น)</Text>
      <TouchableOpacity style={styles.button} onPress={addProductImage}>
        <Text style={styles.buttonText}>+ เพิ่มเสื้อผ้า</Text>
      </TouchableOpacity>

      <View style={styles.productsRow}>
        {productImages.map((uri, index) => (
          <View key={index} style={styles.thumbWrap}>
            <Image source={{ uri }} style={styles.thumb} />
            <TouchableOpacity
              style={styles.thumbRemove}
              onPress={() => removeProductImage(index)}
            >
              <Text style={styles.thumbRemoveText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#34C759" }]}
        onPress={tryOnAll}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "กำลังประมวลผล..." : "เริ่มลองใส่ทั้งหมด"}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 10 }} />}

      {resultImage && (
        <>
          <Text style={styles.label}>ผลลัพธ์สุดท้าย</Text>
          <Image source={{ uri: resultImage }} style={styles.resultImage} />
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  label: { fontSize: 18, marginTop: 18, marginBottom: 6 },
  button: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  mainImage: {
    width: "100%",
    height: 250,
    borderRadius: 10,
    marginTop: 10,
  },
  productsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  thumbWrap: {
    position: "relative",
    marginRight: 10,
    marginBottom: 10,
  },
  thumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "red",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRemoveText: { color: "#fff", fontWeight: "bold" },
  resultImage: {
    width: "100%",
    height: 380,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: "#eee",
  },
});
