import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useAuthRequest, ResponseType, makeRedirectUri, DiscoveryDocument } from 'expo-auth-session';
import { useSpotifyStore } from '../store/useSpotifyStore';
import { theme } from '../theme/theme';
import { Music, Check, LogOut } from 'lucide-react-native';

const discovery: DiscoveryDocument = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const SPOTIFY_CLIENT_ID = 'c2e18db5aed3465abdff26ff1af841f3';

export const SpotifyConnect = () => {
    const { token, isTokenValid, setAuthInfo, clearAuth } = useSpotifyStore();
    const isConnected = isTokenValid();

    const [request, response, promptAsync] = useAuthRequest(
        {
            responseType: ResponseType.Code,
            clientId: SPOTIFY_CLIENT_ID,
            scopes: [
                'user-read-playback-state',
                'user-modify-playback-state',
                'user-read-currently-playing'
            ],
            usePKCE: true,
            redirectUri: makeRedirectUri({
                scheme: 'gymbro'
            }),
        },
        discovery
    );

    // DEBUG: print the exact redirect uri so the developer can copy into Spotify Dashboard
    useEffect(() => {
        console.log("👉 ADD THIS URL TO SPOTIFY DASHBOARD REDIRECT URIs:");
        console.log(makeRedirectUri({ scheme: 'gymbro' }));
    }, []);

    useEffect(() => {
        if (response?.type === 'success' && request?.codeChallenge) {
            const { code } = response.params;
            // Exchange code for token using PKCE
            fetch(discovery.tokenEndpoint!, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: SPOTIFY_CLIENT_ID,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: makeRedirectUri({ scheme: 'gymbro' }),
                    code_verifier: request.codeVerifier || '',
                }).toString()
            })
                .then(res => res.json())
                .then(data => {
                    if (data.access_token) {
                        setAuthInfo(data.access_token, data.expires_in);
                    }
                })
                .catch(err => console.error('Spotify token exchange error:', err));
        }
    }, [response]);

    if (isConnected) {
        return (
            <View style={styles.connectedContainer}>
                <View style={styles.connectedRow}>
                    <View style={styles.iconCircle}>
                        <Music size={18} color="#1DB954" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.connectedTitle}>Spotify Conectado</Text>
                        <Text style={styles.connectedSub}>Mini-player ativado nos treinos</Text>
                    </View>
                    <TouchableOpacity onPress={clearAuth} style={styles.disconnectBtn}>
                        <LogOut size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View>
            <TouchableOpacity
                style={styles.connectButton}
                disabled={!request}
                onPress={() => promptAsync()}
            >
                <Music size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.connectText}>Conectar com Spotify</Text>
            </TouchableOpacity>
            {!isConnected && (
                <Text selectable style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 10, textAlign: 'center' }}>
                    Aviso: Copie o link baixo e adicione no {`\n`}
                    Spotify Dashboard (Redirect URIs): {`\n`}
                    <Text style={{ fontWeight: 'bold', color: theme.colors.white }}>{makeRedirectUri({ scheme: 'gymbro' })}</Text>
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    connectButton: {
        backgroundColor: '#1DB954',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 10,
    },
    connectText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    connectedContainer: {
        backgroundColor: '#1DB954' + '15',
        borderWidth: 1,
        borderColor: '#1DB954' + '40',
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
    },
    connectedRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1DB954',
        justifyContent: 'center',
        alignItems: 'center',
    },
    connectedTitle: {
        color: '#1DB954',
        fontWeight: 'bold',
        fontSize: 14,
    },
    connectedSub: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.7,
    },
    disconnectBtn: {
        padding: 8,
        backgroundColor: '#e74c3c',
        borderRadius: 8,
    }
});
