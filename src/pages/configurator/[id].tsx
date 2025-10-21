import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Script from 'next/script';
import { apiClient, type FurnitureModel } from '@/lib/apiClient';

export default function ConfiguratorPage() {
  const router = useRouter();
  const { id } = router.query;

  const [model, setModel] = useState<FurnitureModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);

  // Configuration state - valeurs par défaut depuis le prompt du modèle
  const [modules, setModules] = useState(1);
  const [height, setHeight] = useState(730);
  const [depth, setDepth] = useState(320);
  const [socle, setSocle] = useState('metal');
  const [finish, setFinish] = useState('mat');
  const [color, setColor] = useState('#FFFFFF');
  const [colorLabel, setColorLabel] = useState('Blanc');
  const [price, setPrice] = useState(899);

  useEffect(() => {
    if (id) {
      loadModel();
    }
  }, [id]);

  const loadModel = async () => {
    try {
      const modelData = await apiClient.models.getById(Number(id));
      setModel(modelData);

      // Parser le prompt pour initialiser les valeurs
      if (modelData.prompt) {
        parsePromptToConfig(modelData.prompt);
      }

      // Prix de base
      if (modelData.base_price) {
        setPrice(modelData.base_price);
      }

      // Générer automatiquement le modèle 3D par défaut
      if (modelData.prompt) {
        await generateDefaultModel(modelData.prompt);
      }
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultModel = async (prompt: string) => {
    setGenerating(true);
    try {
      const result = await apiClient.generate.generate(prompt);
      setGlbUrl(result.glb_url);
    } catch (error) {
      console.error('Error generating default 3D model:', error);
    } finally {
      setGenerating(false);
    }
  };

  const parsePromptToConfig = (prompt: string) => {
    // Format: M1(1700,500,730)EFH3(F,T,F)
    const moduleMatch = prompt.match(/M(\d+)/);
    const dimensionsMatch = prompt.match(/\((\d+),(\d+),(\d+)\)/);

    if (moduleMatch) {
      setModules(parseInt(moduleMatch[1]));
    }

    if (dimensionsMatch) {
      setHeight(parseInt(dimensionsMatch[3]));
      setDepth(parseInt(dimensionsMatch[2]));
    }
  };

  const handleGenerate = async () => {
    if (!model) return;

    setGenerating(true);
    try {
      // Utiliser le prompt du modèle ou générer un nouveau
      const prompt = model.prompt;
      const result = await apiClient.generate.generate(prompt);
      setGlbUrl(result.glb_url);
    } catch (error) {
      console.error('Error generating 3D model:', error);
      alert('Erreur lors de la génération du modèle 3D');
    } finally {
      setGenerating(false);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const colorValue = e.target.value;
    setColor(colorValue);

    // Déterminer le nom de la couleur
    const colorNames: { [key: string]: string } = {
      '#FFFFFF': 'Blanc',
      '#000000': 'Noir',
      '#FF6B35': 'Orange',
      '#8B4513': 'Marron',
      '#D3D3D3': 'Gris'
    };

    setColorLabel(colorNames[colorValue.toUpperCase()] || 'Personnalisé');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '24px', color: '#6B6B6B' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2C' }}>Modèle non trouvé</h1>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary"
            style={{ marginTop: '24px' }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Configurateur - {model.name} | ArchiMeuble</title>
      </Head>

      {/* Load Model Viewer */}
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.1/model-viewer.min.js"
      />

      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <a href="/">ArchiMeuble</a>
          </div>
          <ul className="nav-links">
            <li><a href="/">Accueil</a></li>
            <li><a href="#" className="active">Configurer</a></li>
          </ul>
        </div>
      </nav>

      {/* Configurator Container */}
      <div className="configurator-container">
        {/* Left: 3D Viewer */}
        <div className="viewer-section">
          <div className="viewer-wrapper">
            {/* Model Viewer 3D */}
            <model-viewer
              src={glbUrl ? `http://localhost:8000${glbUrl}` : ''}
              alt={model.name}
              camera-controls
              auto-rotate
              shadow-intensity="1"
              style={{ width: '100%', height: '100%' }}
            >
              <div className={`loading-overlay ${!generating ? 'hidden' : ''}`} id="loading-overlay">
                <div className="spinner"></div>
                <p>Génération du meuble 3D...</p>
              </div>
            </model-viewer>
          </div>
        </div>

        {/* Right: Configuration Panel */}
        <div className="config-panel">
          <div className="panel-header">
            <h1>Personnalisez votre meuble</h1>
            <p className="subtitle">Configurez chaque détail selon vos préférences</p>
          </div>

          <div className="panel-content">
            {/* Modules Section */}
            <div className="control-group">
              <label className="control-label">Nombre de modules</label>
              <div className="button-group">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    className={`toggle-btn ${modules === num ? 'active' : ''}`}
                    onClick={() => setModules(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Hauteur Section */}
            <div className="control-group">
              <label className="control-label">
                Hauteur: <span id="height-value">{height}</span> mm
              </label>
              <input
                type="range"
                id="height-slider"
                min="500"
                max="1000"
                value={height}
                step="10"
                onChange={(e) => setHeight(Number(e.target.value))}
                className="slider"
              />
              <div className="slider-labels">
                <span>50cm</span>
                <span>100cm</span>
              </div>
            </div>

            {/* Profondeur Section */}
            <div className="control-group">
              <label className="control-label">Profondeur</label>
              <div className="button-group">
                {[240, 320, 400, 500].map((depthValue) => (
                  <button
                    key={depthValue}
                    className={`toggle-btn ${depth === depthValue ? 'active' : ''}`}
                    onClick={() => setDepth(depthValue)}
                  >
                    {depthValue / 10}cm
                  </button>
                ))}
              </div>
            </div>

            {/* Socle Section */}
            <div className="control-group">
              <label className="control-label" htmlFor="socle-select">Socle</label>
              <select
                id="socle-select"
                className="select-input"
                value={socle}
                onChange={(e) => setSocle(e.target.value)}
              >
                <option value="none">Sans socle</option>
                <option value="metal">Métal</option>
                <option value="wood">Bois</option>
              </select>
            </div>

            {/* Finition Section */}
            <div className="control-group">
              <label className="control-label">Finition</label>
              <div className="button-group">
                {[
                  { value: 'mat', label: 'Mat' },
                  { value: 'brillant', label: 'Brillant' },
                  { value: 'bois', label: 'Bois' }
                ].map((item) => (
                  <button
                    key={item.value}
                    className={`toggle-btn ${finish === item.value ? 'active' : ''}`}
                    onClick={() => setFinish(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur Section */}
            <div className="control-group">
              <label className="control-label" htmlFor="color-picker">Couleur</label>
              <div className="color-picker-wrapper">
                <input
                  type="color"
                  id="color-picker"
                  value={color}
                  onChange={handleColorChange}
                  className="color-input"
                />
                <span className="color-label">{colorLabel}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="divider"></div>

            {/* Prix Section */}
            <div className="price-section">
              <div className="price-label">Prix total</div>
              <div className="price-value">
                <span id="price">{price.toFixed(0)}</span> €
              </div>
            </div>

            {/* Actions */}
            <div className="actions">
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Génération...' : 'Générer le meuble 3D'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => router.push('/')}
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
