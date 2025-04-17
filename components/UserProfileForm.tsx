// src/components/forms/UserProfileForm.tsx (Option 1: External URL)
'use client';

import React, { useState, useEffect } from 'react';
import { getAuth, updateProfile, User } from 'firebase/auth';
// REMOVE Firebase Storage imports: getStorage, ref, uploadBytes, getDownloadURL, deleteObject
import { Button, TextInput, Text, Alert, LoadingOverlay, Box, Group } from '@mantine/core';
import { IconUser, IconMail, IconX, IconAlertCircle, IconLink } from '@tabler/icons-react'; // Added IconLink
import UserAvatar from '@/components/layouts/userAvatar';

interface UserProfileFormProps {
    targetUserUid: string;
    currentUser: User | null;
    isAdmin: boolean;
    onProfileUpdate?: () => void;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({
    targetUserUid,
    currentUser,
    isAdmin,
    onProfileUpdate,
}) => {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    // REMOVE photoFile state
    // const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoUrlInput, setPhotoUrlInput] = useState(''); // State for the URL input field
    const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null); // Still needed for UserAvatar
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialDisplayName, setInitialDisplayName] = useState('');
    const [initialPhotoUrl, setInitialPhotoUrl] = useState<string | null>(null);

    const canEdit = isAdmin || (currentUser?.uid === targetUserUid);

    useEffect(() => {
        // Fetch user data logic remains mostly the same
        const fetchUserData = () => {
             if (!canEdit) { setError("Permission denied."); return; }
             setLoading(true); setError(null);
             if (currentUser && currentUser.uid === targetUserUid) {
                 setDisplayName(currentUser.displayName || '');
                 setEmail(currentUser.email || 'No email');
                 setCurrentPhotoUrl(currentUser.photoURL);
                 setPhotoUrlInput(currentUser.photoURL || ''); // Initialize input with current URL
                 setInitialDisplayName(currentUser.displayName || '');
                 setInitialPhotoUrl(currentUser.photoURL);
             } else if (isAdmin) { /* ... handle admin case ... */ }
             setLoading(false);
        };
        if (targetUserUid) fetchUserData();
     }, [targetUserUid, currentUser, isAdmin, canEdit]);

    // REMOVE handleFileChange

    const handleRemovePhoto = async () => {
        // Logic to remove photo from Auth profile (no storage deletion needed)
        if (!canEdit || !initialPhotoUrl || !(currentUser?.uid === targetUserUid)) {
             setError(isAdmin ? "Admin removal requires backend." : "Cannot remove photo."); return; }
        if (!confirm("Remove profile picture URL?")) return;
        setLoading(true); setError(null);
        const auth = getAuth();
        const userToUpdate = auth.currentUser;
        if (userToUpdate) {
            try {
                await updateProfile(userToUpdate, { photoURL: null });
                setCurrentPhotoUrl(null); setInitialPhotoUrl(null); setPhotoUrlInput(''); // Clear input
                alert("Profile picture removed."); onProfileUpdate?.();
            } catch (updateError: any) { setError(`Error removing photo: ${updateError.message}`); }
        } setLoading(false);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canEdit || !(currentUser?.uid === targetUserUid)) {
             setError(isAdmin ? "Admin updates require backend." : "Cannot update profile."); return; }
        setLoading(true); setError(null);

        // Use the URL from the input field directly
        const finalPhotoURL: string | null = photoUrlInput.trim() || null; // Use trimmed input or null

        try {
            // Prepare Auth updates
            const profileUpdates: { displayName?: string; photoURL?: string | null } = {};
            let needsAuthUpdate = false;
            if (displayName !== initialDisplayName) { profileUpdates.displayName = displayName; needsAuthUpdate = true; }
            // Check if the input URL is different from the initial one
            if (finalPhotoURL !== initialPhotoUrl) { profileUpdates.photoURL = finalPhotoURL; needsAuthUpdate = true; }

            // Update Auth Profile if changes detected
            if (needsAuthUpdate) {
                await updateProfile(currentUser, profileUpdates);
                setInitialDisplayName(profileUpdates.displayName ?? initialDisplayName);
                setInitialPhotoUrl(profileUpdates.photoURL ?? initialPhotoUrl); // Update initial URL state
                setCurrentPhotoUrl(profileUpdates.photoURL ?? initialPhotoUrl); // Update displayed URL
            }

            // No storage upload/deletion needed
            setError(null);
            alert("Profile updated successfully!"); onProfileUpdate?.();

        } catch (error: any) {
            setError(`Error updating profile: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Render Form
    return (
        <Box pos="relative">
            <LoadingOverlay visible={loading} overlayBlur={2} />
            <form onSubmit={handleSubmit}>
                <fieldset disabled={!canEdit || loading}>
                    <Text size="lg" weight={600} mb="lg">Edit Profile</Text>
                    {error && (<Alert /*...*/ mb="md">{error}</Alert>)}

                    {/* Display Avatar */}
                    <Group mb="md" align="center">
                         <UserAvatar src={currentPhotoUrl} name={displayName} size={80} />
                         {/* No file input or remove button for direct URL */}
                    </Group>

                    <TextInput
                        label="Display Name" /*...*/ value={displayName} onChange={(e) => setDisplayName(e.currentTarget.value)} required mb="md" disabled={!canEdit || loading}
                        icon={<IconUser size="1rem" />}
                    />

                    {/* Input for Photo URL */}
                    <TextInput
                        label="Profile Picture URL"
                        placeholder="https://example.com/image.jpg"
                        value={photoUrlInput}
                        onChange={(event) => setPhotoUrlInput(event.currentTarget.value)}
                        mb="md"
                        icon={<IconLink size="1rem" />} // Use link icon
                        disabled={!canEdit || loading}
                    />
                     {/* Button to clear the URL input and remove from profile */}
                     {initialPhotoUrl && canEdit && (
                        <Button
                            size="xs"
                            variant="light"
                            color="red"
                            mb="md" // Adjust margin
                            onClick={handleRemovePhoto}
                            leftIcon={<IconX size="0.8rem" />}
                            disabled={loading}
                        >
                            Remove Photo URL
                        </Button>
                     )}


                    <TextInput label="Email" value={email} readOnly mb="md" disabled icon={<IconMail size="1rem" />} />

                    {/* --- No custom fields without DB --- */}

                    {canEdit && ( <Button type="submit" loading={loading} disabled={loading}> Save Changes </Button> )}
                    {!canEdit && !loading && ( <Text color="dimmed">Permission denied to edit.</Text> )}
                </fieldset>
            </form>
        </Box>
    );
};

export default UserProfileForm;