import { useParams } from 'react-router-dom'
import { ShopPagePlaceholder } from '../../components/shop/ShopPagePlaceholder'

export default function ShopStoragePage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  return <ShopPagePlaceholder />
}
