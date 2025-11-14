import { View, Text, StyleSheet, ImageBackground, Pressable } from 'react-native'
import React from 'react'
import { Fonts } from '@/constants/theme'
import migraine from "@/assets/images/migraine.png"
import {Link} from 'expo-router'

const app = () => {
  return (
    <View style={styles.container}>

      <ImageBackground 
      source={migraine}
      resizeMode="cover"
      style={styles.image}
      >
      <Text style={styles.title}> Bye Migraine</Text>
      <Link href="/menu" style={{marginHorizontal: 'auto'}} asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Our Menu</Text>
        </Pressable>
      </Link>

      <Link href="/contact" style={{marginHorizontal: 'auto'}} asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>contact us</Text>
        </Pressable>
      </Link>

      </ImageBackground>
    </View>
  );
}

export default app
const styles = StyleSheet.create({
  container:{
    flex: 1,
    flexDirection: 'column', 
  },
  image:{
    width:'100%',
    height:'100%',
    resizeMode:'cover',
    justifyContent:"center",
  },
  link:{
    color:'white',
    fontSize: 52,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecorationLine: 'underline',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
  },
  title:{
    color:'white',
    fontSize: 52,
    fontWeight: 'bold',
    textAlign: 'center',
   
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginBottom: 240,
  },
  button:{
    height: 50,
    width: 120,
    borderRadius: 20,
    backgroundColor:'rgba(0,0,0,5)',
    justifyContent:"center",
    padding: 6,
    marginBottom: 40,
  },
  buttonText:{
    color:'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center', 
    paddingTop: 0,       // reduce top padding
    paddingBottom: 5,    // add bottom padding
    lineHeight: 18,      
  },
})


