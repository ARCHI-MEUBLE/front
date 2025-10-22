import { useEffect, useState, useCallback } from 'react';
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

  // Prompt du template (comme dans configurator.js)
  const [templatePrompt, setTemplatePrompt] = useState<string | null>(null);

  // Configuration state - valeurs par défaut depuis le prompt du modèle
  const [modules, setModules] = useState(3);
  const [height, setHeight] = useState(730);
  const [depth, setDepth] = useState(500);
  const [socle, setSocle] = useState('none');
  const [finish, setFinish] = useState('mat');
  const [color, setColor] = useState('#FFFFFF');
  const [colorLabel, setColorLabel] = useState('Blanc');
  const [price, setPrice] = useState(899);
  const [doorsOpen, setDoorsOpen] = useState(true); // true = avec portes, false = sans portes

  useEffect(() => {
    if (id) {
      loadModel();
    }
  }, [id]);

  const loadModel = async () => {
    try {
      const modelData = await apiClient.models.getById(Number(id));
      setModel(modelData);

      // Stocker le prompt du template (comme dans configurator.js)
      if (modelData.prompt) {
        setTemplatePrompt(modelData.prompt);
        parsePromptToConfig(modelData.prompt);
      }

      // Prix de base
      if (modelData.price) {
        setPrice(modelData.price);
      }

      // Générer automatiquement le modèle 3D par défaut avec le prompt du template
      if (modelData.prompt) {
        await generateModel(modelData.prompt);
      }
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
  };

  const parsePromptToConfig = (prompt: string) => {
    // Format: M1(1700,500,730)EbFH3(F,T,F)
    const dimensionsMatch = prompt.match(/\((\d+),(\d+),(\d+)\)/);

    if (dimensionsMatch) {
      const largeur = parseInt(dimensionsMatch[1]);
      const profondeur = parseInt(dimensionsMatch[2]);
      const hauteur = parseInt(dimensionsMatch[3]);

      // Calculer les modules depuis la largeur (500mm par module)
      setModules(Math.round(largeur / 500));
      setHeight(hauteur);
      setDepth(profondeur);
    }
  };

  // Fonction pour modifier uniquement les dimensions du prompt (comme modifyPromptDimensions)
  const modifyPromptDimensions = (prompt: string, largeur: number, profondeur: number, hauteur: number): string => {
    const regex = /^(M[1-5])\((\d+),(\d+),(\d+)\)(.*)$/;
    const match = prompt.match(regex);

    if (match) {
      const meubleType = match[1];
      const reste = match[5];
      return `${meubleType}(${largeur},${profondeur},${hauteur})${reste}`;
    }

    console.warn('Impossible de parser le prompt:', prompt);
    return prompt;
  };

  // Fonction pour calculer le prix (comme calculatePrice)
  const calculatePrice = (config: any): number => {
    let price = 580; // Prix de base incluant EbF

    // Ajouter le prix des modules (150€ par module)
    price += config.modules * 150;

    // Ajouter le prix de la hauteur (2€ par cm au-dessus de 60cm)
    const hauteurCm = Math.round(config.height / 10);
    if (hauteurCm > 60) {
      price += (hauteurCm - 60) * 2;
    }

    // Ajouter le prix de la profondeur (3€ par cm)
    const profondeurCm = Math.round(config.depth / 10);
    price += profondeurCm * 3;

    // Ajouter le prix de la finition
    const finitionPrices: { [key: string]: number } = {
      'mat': 0,
      'brillant': 60,
      'bois': 100
    };
    price += finitionPrices[config.finish] || 0;

    // Ajouter le prix du socle
    const soclePrices: { [key: string]: number } = {
      'none': 0,
      'metal': 40,
      'wood': 60
    };
    price += soclePrices[config.socle] || 0;

    return price;
  };

  // Génère le modèle 3D avec le prompt (comme generateModel)
  const generateModel = useCallback(async (prompt: string) => {
    console.log('Génération du modèle 3D avec prompt:', prompt, 'doorsOpen:', doorsOpen);
    setGenerating(true);

    try {
      const result = await apiClient.generate.generate(prompt, !doorsOpen); // closed = !doorsOpen
      console.log('✓ Modèle 3D généré:', result.glb_url);
      setGlbUrl(result.glb_url);
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      alert('Erreur lors de la génération du meuble 3D');
    } finally {
      setGenerating(false);
    }
  }, [doorsOpen]);

  // useEffect pour régénérer quand la configuration change
  useEffect(() => {
    if (!templatePrompt) return;

    // Modifier les dimensions du prompt du template
    const largeur = modules * 500; // 500mm par module
    const modifiedPrompt = modifyPromptDimensions(templatePrompt, largeur, depth, height);

    // Calculer le prix
    const newPrice = calculatePrice({ modules, height, depth, finish, socle });
    setPrice(newPrice);

    // Générer le modèle 3D avec un délai pour debounce
    const timer = setTimeout(() => {
      generateModel(modifiedPrompt);
    }, 300);

    return () => clearTimeout(timer);
  }, [templatePrompt, modules, height, depth, socle, finish, generateModel]); // Dépendances

  // Handlers pour les changements de contrôles
  const handleModulesChange = (newModules: number) => {
    setModules(newModules);
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
  };

  const handleDepthChange = (newDepth: number) => {
    setDepth(newDepth);
  };

  const handleSocleChange = (newSocle: string) => {
    setSocle(newSocle);
  };

  const handleFinishChange = (newFinish: string) => {
    setFinish(newFinish);
  };

  const toggleDoors = () => {
    setDoorsOpen(!doorsOpen);
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
              src={glbUrl || ''}
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
                    onClick={() => handleModulesChange(num)}
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
                onChange={(e) => handleHeightChange(Number(e.target.value))}
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
                    onClick={() => handleDepthChange(depthValue)}
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
                onChange={(e) => handleSocleChange(e.target.value)}
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
                    onClick={() => handleFinishChange(item.value)}
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

            {/* Portes/Tiroirs Section */}
            <div className="control-group">
              <label className="control-label">Portes & Tiroirs</label>
              <div className="button-group">
                <button
                  className={`toggle-btn ${doorsOpen ? 'active' : ''}`}
                  onClick={toggleDoors}
                  title="Afficher avec portes et tiroirs ouverts"
                >
                  Ouverts
                </button>
                <button
                  className={`toggle-btn ${!doorsOpen ? 'active' : ''}`}
                  onClick={toggleDoors}
                  title="Masquer les portes et fermer les tiroirs"
                >
                  Fermés
                </button>
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
                className="btn btn-secondary"
                onClick={() => router.push('/')}
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
