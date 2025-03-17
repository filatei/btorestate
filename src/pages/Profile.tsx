import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, Building2, Phone, MapPin, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  phoneNumber: string;
  unitAddress: string;
  bio: string;
  photoURL?: string;
}

const MAX_IMAGE_SIZE = 200 * 1024; // 200KB in bytes

const Profile = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile>({
    phoneNumber: '',
    unitAddress: '',
    bio: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      
      try {
        const docRef = doc(db, 'userProfiles', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image size must be less than 200KB');
      return;
    }

    setIsUploading(true);
    try {
      // Compress image if needed
      const compressedFile = await compressImage(file);
      
      const storage = getStorage();
      const storageRef = ref(storage, `profileImages/${currentUser.uid}`);
      
      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update auth profile
      await updateProfile(currentUser, {
        photoURL: downloadURL
      });
      
      // Update profile in Firestore
      const docRef = doc(db, 'userProfiles', currentUser.uid);
      await updateDoc(docRef, {
        photoURL: downloadURL
      });
      
      setProfile(prev => ({ ...prev, photoURL: downloadURL }));
      toast.success('Profile image updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to update profile image');
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > 800) {
              height = Math.round((height * 800) / width);
              width = 800;
            }
          } else {
            if (height > 800) {
              width = Math.round((width * 800) / height);
              height = 800;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.7 // compression quality
          );
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const docRef = doc(db, 'userProfiles', currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create new profile document if it doesn't exist
        await setDoc(docRef, {
          ...profile,
          userId: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          createdAt: new Date()
        });
      } else {
        // Update existing profile
        await updateDoc(docRef, profile);
      }
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <User className="h-6 w-6 text-indigo-600" />
          <h1 className="ml-2 text-2xl font-semibold">Profile Settings</h1>
        </div>

        <div className="mb-6 flex items-center">
          <div className="relative">
            <img
              src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName}`}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
              disabled={isUploading}
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold">{currentUser?.displayName}</h2>
            <p className="text-gray-600">{currentUser?.email}</p>
            <p className="text-xs text-gray-500 mt-1">Max image size: 200KB</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 mr-2" />
              Phone Number
            </label>
            <input
              type="tel"
              value={profile.phoneNumber}
              onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 mr-2" />
              Unit Address
            </label>
            <input
              type="text"
              value={profile.unitAddress}
              onChange={(e) => setProfile({ ...profile, unitAddress: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your unit address"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Building2 className="h-4 w-4 mr-2" />
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
              placeholder="Tell us about yourself"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;