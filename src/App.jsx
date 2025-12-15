import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { marked } from 'marked'

function App() {
  // Состояния
  const [tags, setTags] = useState([])
  const [articles, setArticles] = useState([])
  const [filteredArticles, setFilteredArticles] = useState([])
  const [selectedTag, setSelectedTag] = useState('')
  const [minScore, setMinScore] = useState(50)
  const [selectedModels, setSelectedModels] = useState([])
  const [selectedSources, setSelectedSources] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState({ tags: true, articles: false })
  const [error, setError] = useState(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentArticle, setCurrentArticle] = useState(null)
  const [articleContent, setArticleContent] = useState('')
  const [articleTags, setArticleTags] = useState([])

  // API базовый URL из переменных окружения
  // Базовый URL бэкенда (без префиксов)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:80'
  
  // Для разработки используем прокси Vite ('/api')
  // Для продакшена используем полный URL
  const IS_DEVELOPMENT = import.meta.env.DEV
  
  // Функция для создания правильного URL
  const getApiUrl = (endpoint) => {
    if (IS_DEVELOPMENT) {
      // В режиме разработки используем прокси Vite
      return `/api${endpoint}`
    } else {
      // В продакшене используем полный URL
      return `${API_BASE_URL}${endpoint}`
    }
  }

  // Загружаем теги при монтировании
  useEffect(() => {
    fetchTags()
  }, [])

  // Функция загрузки тегов
  const fetchTags = async () => {
    try {
      setLoading(prev => ({ ...prev, tags: true }))
      const url = getApiUrl('/tags')
      console.log('Запрос тегов по URL:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setTags(data)
      setError(null)
    } catch (err) {
      setError('Ошибка загрузки тегов: ' + err.message)
      console.error('Ошибка загрузки тегов:', err)
    } finally {
      setLoading(prev => ({ ...prev, tags: false }))
    }
  }

  // Функция загрузки статей
  const fetchArticles = async (params = {}) => {
    try {
      setLoading(prev => ({ ...prev, articles: true }))
      setError(null)
      
      // Формируем параметры запроса
      const queryParams = new URLSearchParams()
      queryParams.append('tag', params.tag || '')
      queryParams.append('minScore', params.minScore || 50)
      
      if (params.models && params.models.length > 0) {
        params.models.forEach(model => {
          queryParams.append('model', model)
        })
      }
      
      if (params.sources && params.sources.length > 0) {
        params.sources.forEach(source => {
          queryParams.append('source', source)
        })
      }
      
      const endpoint = `/getArticlesByTag?${queryParams.toString()}`
      const url = getApiUrl(endpoint)
      console.log('Запрос статей по URL:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Получено статей:', data.length)
      return data
    } catch (err) {
      setError('Ошибка загрузки статей: ' + err.message)
      console.error('Ошибка загрузки статей:', err)
      return []
    } finally {
      setLoading(prev => ({ ...prev, articles: false }))
    }
  }

  // Функция загрузки тегов статьи
  const fetchArticleTags = async (articleId) => {
    try {
      const url = getApiUrl(`/getArticleTags?id=${articleId}`)
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (err) {
      console.error('Ошибка загрузки тегов статьи:', err)
      return []
    }
  }

  // Основная функция фильтрации
  const applyFilters = async () => {
    if (!selectedTag) {
      setError('Выберите тег для фильтрации')
      return
    }
    
    const articlesData = await fetchArticles({
      tag: selectedTag,
      minScore: minScore,
      models: selectedModels,
      sources: selectedSources
    })

    setArticles(articlesData)
    setFilteredArticles(articlesData)
  }

  // Фильтрация по поисковому запросу (локальная)
  const filterArticles = useCallback((query = '') => {
    if (!query.trim()) {
      setFilteredArticles(articles)
      return
    }

    const filtered = articles.filter(article => {
      const searchText = `${article.name || ''} ${article.source?.name || ''}`.toLowerCase()
      return searchText.includes(query.toLowerCase())
    })

    setFilteredArticles(filtered)
  }, [articles])

  // Debounce для поиска
  const debounce = (fn, ms = 300) => {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => fn(...args), ms)
    }
  }

  const debouncedFilter = useCallback(
    debounce((query) => {
      filterArticles(query)
    }, 300),
    [filterArticles]
  )

  // Обработчик изменения тега
  const handleTagChange = (e) => {
    const tagName = e.target.value
    setSelectedTag(tagName)
  }

  // Обработчик изменения порога
  const handleScoreChange = (e) => {
    setMinScore(Number(e.target.value))
  }

  // Обработчик изменения моделей
  const handleModelChange = (e) => {
    const values = Array.from(e.target.selectedOptions, option => option.value)
    setSelectedModels(values)
  }

  // Обработчик изменения источников
  const handleSourceChange = (e) => {
    const values = Array.from(e.target.selectedOptions, option => option.value)
    setSelectedSources(values)
  }

  // Обработчик поиска
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    debouncedFilter(value)
  }

  // Сброс фильтров
  const handleReset = () => {
    setSelectedTag('')
    setMinScore(50)
    setSelectedModels([])
    setSelectedSources([])
    setSearchQuery('')
    setArticles([])
    setFilteredArticles([])
    setViewerOpen(false)
    setCurrentArticle(null)
    setArticleContent('')
    setArticleTags([])
    setError(null)
  }

  // Открытие статьи для просмотра
  const openArticle = async (article) => {
    setCurrentArticle(article)
    setViewerOpen(true)
    setArticleContent('<em>Загрузка контента...</em>')
    
    const tagsData = await fetchArticleTags(article.id)
    setArticleTags(tagsData)
    
    setArticleContent(article.content || 'Нет контента')
  }

  // Закрытие просмотрщика
  const closeViewer = () => {
    setViewerOpen(false)
    setCurrentArticle(null)
    setArticleContent('')
    setArticleTags([])
  }

  // Получаем уникальные модели из всех статей
  const getUniqueModels = () => {
    const models = new Set()
    articles.forEach(article => {
      article.tagScores?.forEach(score => {
        if (score.model?.name) {
          models.add(score.model.name)
        }
      })
    })
    return Array.from(models)
  }

  // Получаем уникальные источники из всех статей
  const getUniqueSources = () => {
    const sources = new Set()
    articles.forEach(article => {
      if (article.source?.name) {
        sources.add(article.source.name)
      }
    })
    return Array.from(sources)
  }

  // Получаем максимальный вес для выбранного тега в статье
  const getMaxScoreForTag = (article, tagName) => {
    if (!article.tagScores) return 0
    
    const scoresForTag = article.tagScores
      .filter(score => score.tag?.name === tagName)
      .map(score => score.weight)
    
    return scoresForTag.length > 0 ? Math.max(...scoresForTag) : 0
  }

  return (
    <div id="app" className="app">
      <aside className="panel">
        <div className="brand">ТД — Тегирование</div>
        
        {/* Отладочная информация */}
        {IS_DEVELOPMENT && (
          <div style={{
            fontSize: '11px',
            color: '#666',
            padding: '4px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            marginBottom: '8px'
          }}>
            Режим: Разработка<br />
            Бэкенд: {API_BASE_URL}<br />
            Прокси: {IS_DEVELOPMENT ? 'Включён' : 'Выключен'}
          </div>
        )}

        {/* Выбор тега */}
        <div className="control">
          <label>Тег</label>
          <select 
            id="tagSelect"
            value={selectedTag}
            onChange={handleTagChange}
            disabled={loading.tags}
          >
            <option value="">{loading.tags ? 'Загрузка...' : '— выбрать тег —'}</option>
            {tags.map(tag => (
              <option key={tag.id} value={tag.name}>
                {tag.name} ({tag.type})
              </option>
            ))}
          </select>
        </div>

        {/* Порог */}
        <div className="control row">
          <label>Порог (score ≥)</label>
          <input 
            id="scoreRange" 
            type="range" 
            min="0" 
            max="100" 
            value={minScore}
            onChange={handleScoreChange}
          />
          <output id="scoreValue">{minScore}</output>
        </div>

        {/* Фильтр по моделям */}
        <div className="control">
          <label>Модель</label>
          <select 
            id="modelFilter" 
            multiple
            value={selectedModels}
            onChange={handleModelChange}
            size="3"
            disabled={articles.length === 0}
          >
            {getUniqueModels().map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          {articles.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              Загрузите статьи для выбора моделей
            </div>
          )}
        </div>

        {/* Фильтр по источникам */}
        <div className="control">
          <label>Источник</label>
          <select 
            id="sourceFilter" 
            multiple
            value={selectedSources}
            onChange={handleSourceChange}
            size="3"
            disabled={articles.length === 0}
          >
            {getUniqueSources().map(source => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          {articles.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              Загрузите статьи для выбора источников
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="actions">
          <button 
            id="applyBtn" 
            className="btn primary"
            onClick={applyFilters}
            disabled={loading.articles || !selectedTag}
          >
            {loading.articles ? 'Загрузка...' : 'Применить'}
          </button>
          <button 
            id="resetBtn" 
            className="btn"
            onClick={handleReset}
          >
            Сброс
          </button>
        </div>

        {/* Информация и ошибки */}
        <div className="note">
          {error && (
            <div style={{ 
              color: '#dc2626', 
              marginBottom: '8px', 
              fontSize: '13px',
              padding: '8px',
              backgroundColor: '#fef2f2',
              borderRadius: '4px',
              border: '1px solid #fecaca'
            }}>
              ⚠️ {error}
            </div>
          )}
          {tags.length > 0 && `Тегов: ${tags.length}`}
          {articles.length > 0 && ` • Статей: ${articles.length}`}
          {!loading.tags && tags.length === 0 && 'Не удалось загрузить теги'}
        </div>
      </aside>

      <main className="main">
        {/* Поиск */}
        <header className="main-head">
          <input 
            id="search" 
            placeholder="Поиск по заголовку или источнику"
            value={searchQuery}
            onChange={handleSearchChange}
            disabled={articles.length === 0}
          />
        </header>

        {/* Список статей */}
        <section id="list" className="list">
          {loading.articles ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: 'var(--muted)',
              gridColumn: '1 / -1'
            }}>
              Загрузка статей...
            </div>
          ) : filteredArticles.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: 'var(--muted)',
              gridColumn: '1 / -1'
            }}>
              {selectedTag && articles.length === 0 
                ? `По тегу "${selectedTag}" ничего не найдено` 
                : selectedTag 
                  ? 'Нажмите "Применить" для загрузки статей' 
                  : 'Выберите тег для фильтрации'}
            </div>
          ) : (
            filteredArticles.map(article => {
              const maxScore = getMaxScoreForTag(article, selectedTag)
              
              return (
                <div key={article.id} className="card">
                  <h3>{article.name}</h3>
                  <div className="meta">
                    <span className="tag-pill" style={{
                      backgroundColor: maxScore >= 80 ? '#dcfce7' : 
                                     maxScore >= 50 ? '#fef9c3' : '#fee2e2',
                      color: maxScore >= 80 ? '#166534' : 
                            maxScore >= 50 ? '#854d0e' : '#991b1b'
                    }}>
                      {maxScore}%
                    </span>
                    <span>ID: {article.id}</span>
                    <span>{article.source?.name || 'Без источника'}</span>
                  </div>
                  
                  {/* Все теги статьи */}
                  {article.tagScores && article.tagScores.length > 0 && (
                    <div className="meta">
                      {article.tagScores
                        .filter(score => score.weight > 0)
                        .slice(0, 3)
                        .map(score => (
                          <span 
                            key={`${article.id}-${score.tag.id}`} 
                            className="tag-pill"
                            title={`Модель: ${score.model?.name || 'Неизвестно'}`}
                          >
                            {score.tag.name}:{score.weight}
                          </span>
                        ))}
                      {article.tagScores.filter(score => score.weight > 0).length > 3 && (
                        <span className="tag-pill">
                          +{article.tagScores.filter(score => score.weight > 0).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="actions">
                    <button 
                      className="btn"
                      onClick={() => openArticle(article)}
                    >
                      Просмотр
                    </button>
                    <a 
                      className="link"
                      href={article.web_path}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Источник
                    </a>
                  </div>
                </div>
              )
            })
          )}
        </section>

        {/* Просмотрщик статьи */}
        <div id="viewer" className={`viewer ${viewerOpen ? '' : 'hidden'}`}>
          <div className="viewer-head">
            <button 
              id="closeViewer" 
              className="btn small"
              onClick={closeViewer}
            >
              Закрыть
            </button>
            {currentArticle && (
              <a 
                id="openSource" 
                className="btn small" 
                href={currentArticle.web_path}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть источник
              </a>
            )}
          </div>
          
          {currentArticle && (
            <>
              <h2 style={{ margin: '0 0 10px 0' }}>{currentArticle.name}</h2>
              <div className="meta" style={{ marginBottom: '15px' }}>
                <span>ID: {currentArticle.id}</span>
                <span>Источник: {currentArticle.source?.name}</span>
                <span>Тип контента: {currentArticle.content_type}</span>
              </div>
              
              {/* Все теги статьи */}
              {articleTags.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Теги статьи:</h3>
                  <div className="meta">
                    {articleTags.map(tag => (
                      <span 
                        key={tag.tagId} 
                        className="tag-pill"
                        style={{ 
                          backgroundColor: tag.weight >= 80 ? '#dcfce7' : 
                                         tag.weight >= 50 ? '#fef9c3' : '#fee2e2',
                          color: tag.weight >= 80 ? '#166534' : 
                                tag.weight >= 50 ? '#854d0e' : '#991b1b'
                        }}
                        title={`Модель: ${tag.model}`}
                      >
                        {tag.tagName}:{tag.weight} ({tag.model})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          <article 
            id="docContent" 
            className="doc"
            style={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
          >
            {articleContent}
          </article>
        </div>
      </main>
    </div>
  )
}

export default App